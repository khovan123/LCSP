import { Assessment } from "../../../domain/entities/assessment.entity.js";

export const ASSESSMENT_REPOSITORY = Symbol("ASSESSMENT_REPOSITORY");

export interface AssessmentRepository {
  save(assessment: Assessment): Promise<void>;
}
