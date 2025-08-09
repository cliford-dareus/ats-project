"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import {
  applications,
  candidates,
  job_listings,
  stages,
  interviews
} from "@/drizzle/schema";
import {
  count,
  eq,
  gte,
  lte,
  desc,
  sql,
  and
} from "drizzle-orm";
import { subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";

export async function getDashboardMetrics() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");

  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const startOfThisMonth = startOfMonth(now);
  const startOfLastMonth = startOfMonth(lastMonth);
  const endOfLastMonth = endOfMonth(lastMonth);

  // Current month metrics
  const [
    totalApplicationsResult,
    totalCandidatesResult,
    activeJobsResult,
    hiredThisMonthResult
  ] = await Promise.all([
    db.select({ count: count() }).from(applications),
    db.select({ count: count() }).from(candidates),
    db.select({ count: count() })
      .from(job_listings)
      .where(eq(job_listings.status, 'OPEN')),
    db.select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'Hired'),
          gte(candidates.updated_at, startOfThisMonth)
        )
      )
  ]);

  // Last month metrics for trend calculation
  const [
    lastMonthApplicationsResult,
    lastMonthCandidatesResult,
    lastMonthHiredResult
  ] = await Promise.all([
    db.select({ count: count() })
      .from(applications)
      .where(
        and(
          gte(applications.created_at, startOfLastMonth),
          lte(applications.created_at, endOfLastMonth)
        )
      ),
    db.select({ count: count() })
      .from(candidates)
      .where(
        and(
          gte(candidates.created_at, startOfLastMonth),
          lte(candidates.created_at, endOfLastMonth)
        )
      ),
    db.select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'Hired'),
          gte(candidates.updated_at, startOfLastMonth),
          lte(candidates.updated_at, endOfLastMonth)
        )
      )
  ]);

  const totalApplications = totalApplicationsResult[0]?.count || 0;
  const totalCandidates = totalCandidatesResult[0]?.count || 0;
  const activeJobs = activeJobsResult[0]?.count || 0;
  const hiredThisMonth = hiredThisMonthResult[0]?.count || 0;

  const lastMonthApplications = lastMonthApplicationsResult[0]?.count || 0;
  const lastMonthCandidates = lastMonthCandidatesResult[0]?.count || 0;
  const lastMonthHired = lastMonthHiredResult[0]?.count || 0;

  // Calculate trends
  const applicationsTrend = lastMonthApplications > 0
    ? Math.round(((totalApplications - lastMonthApplications) / lastMonthApplications) * 100)
    : 0;
  const candidatesTrend = lastMonthCandidates > 0
    ? Math.round(((totalCandidates - lastMonthCandidates) / lastMonthCandidates) * 100)
    : 0;
  const hiresTrend = lastMonthHired > 0
    ? Math.round(((hiredThisMonth - lastMonthHired) / lastMonthHired) * 100)
    : 0;

  return {
    totalApplications,
    totalCandidates,
    activeJobs,
    hiredThisMonth,
    applicationsTrend,
    candidatesTrend,
    jobsTrend: 0, // Would need historical job data
    hiresTrend
  };
};

export async function getRecentActivity() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");

  const sevenDaysAgo = subDays(new Date(), 7);

  // Get recent applications
  const recentApplications = await db
    .select({
      id: applications.id,
      candidateName: candidates.name,
      jobName: job_listings.name,
      createdAt: applications.created_at,
      type: sql<string>`'application'`
    })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidate, candidates.id))
    .innerJoin(job_listings, eq(applications.job_id, job_listings.id))
    .where(gte(applications.created_at, sevenDaysAgo))
    .orderBy(desc(applications.created_at))
    .limit(10);

  // Get recent hires
  const recentHires = await db
    .select({
      id: candidates.id,
      candidateName: candidates.name,
      updatedAt: candidates.updated_at,
      type: sql<string>`'hire'`
    })
    .from(candidates)
    .where(
      and(
        eq(candidates.status, 'Hired'),
        gte(candidates.updated_at, sevenDaysAgo)
      )
    )
    .orderBy(desc(candidates.updated_at))
    .limit(5);

  // Get recent job postings
  const recentJobs = await db
    .select({
      id: job_listings.id,
      jobName: job_listings.name,
      createdAt: job_listings.created_at,
      type: sql<string>`'job_posted'`
    })
    .from(job_listings)
    .where(gte(job_listings.created_at, sevenDaysAgo))
    .orderBy(desc(job_listings.created_at))
    .limit(5);

  // Combine and sort all activities
  const allActivities = [
    ...recentApplications.map(app => ({
      id: `app-${app.id}`,
      type: 'application' as const,
      candidate: app.candidateName,
      job: app.jobName,
      timestamp: app.createdAt
    })),
    ...recentHires.map(hire => ({
      id: `hire-${hire.id}`,
      type: 'hire' as const,
      candidate: hire.candidateName,
      job: undefined,
      timestamp: hire.updatedAt
    })),
    ...recentJobs.map(job => ({
      id: `job-${job.id}`,
      type: 'job_posted' as const,
      candidate: undefined,
      job: job.jobName,
      timestamp: job.createdAt
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return allActivities.slice(0, 10);
};

export async function getUpcomingInterviews() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");

  const now = new Date();
  const sevenDaysFromNow = subDays(now, -7);

  const upcomingInterviews = await db
    .select({
      id: interviews.id,
      candidateName: candidates.name,
      jobTitle: job_listings.name,
      startAt: interviews.start_at,
      location: interviews.locations
    })
    .from(interviews)
    .innerJoin(applications, eq(interviews.applications_id, applications.id))
    .innerJoin(candidates, eq(applications.candidate, candidates.id))
    .innerJoin(job_listings, eq(applications.job_id, job_listings.id))
    .where(
      and(
        gte(interviews.start_at, now),
        lte(interviews.start_at, sevenDaysFromNow)
      )
    )
    .orderBy(interviews.start_at)
    .limit(10);

  return upcomingInterviews
    .filter(interview => interview.startAt !== null)
    .map(interview => ({
      id: interview.id.toString(),
      candidateName: interview.candidateName,
      jobTitle: interview.jobTitle,
      time: interview.startAt!,
      type: interview.location?.toLowerCase().includes('phone') ? 'phone' as const :
            interview.location?.toLowerCase().includes('video') ? 'video' as const :
            'in-person' as const
    }));
};

export async function getJobPipelineData() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");

  const jobPipelineData = await db
    .select({
      jobId: job_listings.id,
      jobTitle: job_listings.name,
      stageName: stages.stage_name,
      stageColor: stages.color,
      stageOrder: stages.stage_order_id,
      applicationCount: count(applications.id)
    })
    .from(job_listings)
    .leftJoin(stages, eq(job_listings.id, stages.job_id))
    .leftJoin(applications, eq(stages.id, applications.current_stage_id))
    .where(eq(job_listings.status, 'OPEN'))
    .groupBy(job_listings.id, job_listings.name, stages.stage_name, stages.color, stages.stage_order_id)
    .orderBy(job_listings.id, stages.stage_order_id);

  // Group by job and format stages
  const jobsMap = new Map();

  jobPipelineData.forEach(row => {
    if (!jobsMap.has(row.jobId)) {
      jobsMap.set(row.jobId, {
        jobTitle: row.jobTitle,
        totalApplications: 0,
        stages: []
      });
    }

    const job = jobsMap.get(row.jobId);
    if (row.stageName) {
      job.stages.push({
        name: row.stageName,
        count: row.applicationCount || 0,
        color: row.stageColor || '#6b7280'
      });
      job.totalApplications += row.applicationCount || 0;
    }
  });

  return Array.from(jobsMap.values()).slice(0, 5);
};
