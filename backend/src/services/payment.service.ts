import { PrismaClient, PaymentStatus, SessionStatus, ScheduleStatus } from "@prisma/client";
import { plansService } from "./plans.service";

const prisma = new PrismaClient();

export const paymentService = {
  /**
   * Create a mock payment for a session
   * After payment, updates session status to SCHEDULED and generates session schedule
   */
  async createMockPayment(
    sessionId: string,
    studentId: string,
    paymentMethod: string = "MOCK"
  ): Promise<any> {
    try {
      // 1. Get session with plan
      const session = await prisma.sessions.findUnique({
        where: { id: sessionId },
        include: {
          plans: true,
          payments: true,
        },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      // 2. Verify student owns this session
      if (session.student_id !== studentId) {
        throw new Error("You don't have permission to pay for this session");
      }

      // 3. Check if session is in APPROVED status (payment pending)
      if (session.status !== SessionStatus.APPROVED) {
        throw new Error(
          `Session is not in payment pending status. Current status: ${session.status}`
        );
      }

      // 4. Check if payment already exists (payments is ONE-TO-ONE relation, not array)
      if (session.payments && session.payments.status === PaymentStatus.SUCCESS) {
        throw new Error("Payment already completed for this session");
      }

      // 5. Get plan to get price
      if (!session.plan_id || !session.plans) {
        throw new Error("Session does not have a plan selected");
      }

      const plan = session.plans;
      const amount = plan.price;

      // 6. Create mock payment (simulate success immediately)
      const payment = await prisma.payments.create({
        data: {
          session_id: sessionId,
          amount: amount,
          currency: "INR",
          gateway: "mock",
          gateway_payment_id: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          gateway_order_id: `order_${Date.now()}`,
          status: PaymentStatus.SUCCESS, // Mock payment always succeeds
          payment_method: paymentMethod,
          payment_data: {
            mock: true,
            timestamp: new Date().toISOString(),
          },
          completed_at: new Date(),
        },
      });

      // 7. Update course status (payment SUCCESS may change course from PAYMENT_PENDING to ONGOING)
      const { recalculateCourseStatusForPayment } = await import("./courseStatus.service");
      await recalculateCourseStatusForPayment(payment.id).catch((err) => {
        console.error("[Payment] Error updating course status:", err);
        // Don't fail payment if course status update fails
      });

      // 8. Update session status to SCHEDULED (represents ONGOING)
      await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.SCHEDULED,
          updated_at: new Date(),
        },
      });

      // 8. Generate session schedule
      await this.generateSessionSchedule(sessionId, plan.id, session.scheduled_at);

      // 9. Return payment details
      return {
        id: payment.id,
        sessionId: payment.session_id,
        amount: payment.amount.toNumber(),
        status: payment.status,
        paymentMethod: payment.payment_method,
        completedAt: payment.completed_at,
        gatewayPaymentId: payment.gateway_payment_id,
      };
    } catch (error) {
      console.error("[PaymentService] Error creating mock payment:", error);
      throw error;
    }
  },

  /**
   * Generate session schedule based on plan topics
   * Sessions are scheduled 5 days per week (Mon-Fri) at the student-selected time
   * MUST start from the exact courseStartDate (scheduled_at), not next Monday
   */
  async generateSessionSchedule(
    sessionId: string,
    planId: number,
    courseStartDate: Date
  ): Promise<void> {
    try {
      // Get plan with topics
      const plan = await plansService.getPlanById(planId);
      if (!plan) {
        throw new Error("Plan not found");
      }

      // Get topics ordered by week and session
      const topics = plan.topics.sort((a: any, b: any) => {
        if (a.weekNumber !== b.weekNumber) {
          return a.weekNumber - b.weekNumber;
        }
        return a.sessionNumber - b.sessionNumber;
      });

      // Use the exact courseStartDate - this is the student-selected start date
      const startDate = new Date(courseStartDate);
      
      // Extract time from start date (student-selected time)
      const startHours = startDate.getHours();
      const startMinutes = startDate.getMinutes();
      
      // Set time to the selected time
      startDate.setHours(startHours, startMinutes, 0, 0);

      // Generate schedule entries
      const scheduleEntries = [];
      let currentDate = new Date(startDate); // Start from exact courseStartDate
      let sessionCounter = 0; // Track total sessions across all weeks

      for (let week = 1; week <= plan.durationWeeks; week++) {
        let sessionsInWeek = 0;
        
        // Generate sessions for this week (up to sessionsPerWeek, only weekdays)
        while (sessionsInWeek < plan.sessionsPerWeek) {
          // Skip weekends (Saturday = 6, Sunday = 0)
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Skip weekend, move to next Monday
            const daysToAdd = dayOfWeek === 0 ? 1 : 2; // Sunday -> Monday, Saturday -> Monday
            currentDate.setDate(currentDate.getDate() + daysToAdd);
            continue;
          }

          // This is a weekday, create a session
          sessionCounter++;
          sessionsInWeek++;

          // Find topic for this week and session
          const topic = topics.find(
            (t: any) => t.weekNumber === week && t.sessionNumber === sessionsInWeek
          );

          if (!topic) {
            // If no topic found, still create entry but use default title
            console.warn(`[PaymentService] No topic found for week ${week}, session ${sessionsInWeek}`);
          }

          // Create scheduled date with the selected time
          const scheduledDate = new Date(currentDate);
          scheduledDate.setHours(startHours, startMinutes, 0, 0);

          // Determine initial status: All sessions start as LOCKED
          // Status will be updated by cron job based on time
          const now = new Date();
          let status: ScheduleStatus;
          if (scheduledDate < now) {
            status = ScheduleStatus.COMPLETED;
          } else {
            // All future sessions start as LOCKED
            status = ScheduleStatus.LOCKED;
          }

          // Create time string (HH:MM format)
          const timeString = `${startHours.toString().padStart(2, "0")}:${startMinutes.toString().padStart(2, "0")}:00`;

          scheduleEntries.push({
            session_id: sessionId,
            week_number: week,
            session_number: sessionsInWeek,
            topic_title: topic?.topicTitle || `Session ${sessionCounter}`,
            scheduled_date: scheduledDate,
            scheduled_time: timeString,
            status: status,
          });

          // Move to next weekday
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Insert all schedule entries
      if (scheduleEntries.length > 0) {
        await prisma.session_schedule.createMany({
          data: scheduleEntries,
        });
      }

      console.log(`[PaymentService] Generated ${scheduleEntries.length} schedule entries for session ${sessionId} starting from ${startDate.toISOString()}`);
    } catch (error) {
      console.error("[PaymentService] Error generating session schedule:", error);
      throw error;
    }
  },
};

