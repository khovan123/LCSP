import {
  Assessment,
  type AssessmentStatus,
} from "../../../domain/entities/assessment.entity.js";

export const ASSESSMENT_REPOSITORY = Symbol("ASSESSMENT_REPOSITORY");

export interface AssessmentListCriteria {
  organizationId: string;
  ownerId?: string;
  assessmentId?: string;
  status?: AssessmentStatus;
  page: number;
  pageSize: number;
}

export interface AssessmentListResult {
  items: Assessment[];
  total: number;
}

export interface AssessmentRepository {
  save(assessment: Assessment): Promise<void>;
  findById(id: string): Promise<Assessment | null>;
  findMany(criteria: AssessmentListCriteria): Promise<AssessmentListResult>;
}
