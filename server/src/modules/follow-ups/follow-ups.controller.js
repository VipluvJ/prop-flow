import {
  createFollowUp as createFollowUpService,
  getFollowUps as getFollowUpsService,
  getFollowUpById as getFollowUpByIdService,
  completeFollowUp as completeFollowUpService,
} from "./follow-ups.service.js";

export async function createFollowUp(req, res, next) {
  try {
    const { id } = req.validated.params;
    const data = req.validated.body;

    const result = await createFollowUpService(id, data, req.user);

    if (result.status === "lead_not_found" || result.status === "forbidden") {
      return res.status(404).json({
        success: false,
        message: "Lead not found or you do not have access",
      });
    }

    if (result.status === "assignee_required") {
      return res.status(400).json({
        success: false,
        message: "An agent must be selected for this follow-up",
      });
    }

    if (result.status === "agent_not_found") {
      return res.status(404).json({
        success: false,
        message: "Selected agent not found in your organization",
      });
    }

    if (result.status === "not_an_agent") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a sales agent",
      });
    }

    if (result.status === "inactive_agent") {
      return res.status(400).json({
        success: false,
        message: "Cannot assign a follow-up to an inactive agent",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Follow-up created successfully",
      data: result.followUp,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFollowUps(req, res, next) {
  try {
    const filters = req.validated.query;

    const result = await getFollowUpsService(filters, req.user);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFollowUpById(req, res, next) {
  try {
    const { id } = req.validated.params;

    const followUp = await getFollowUpByIdService(id, req.user);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
}

export async function completeFollowUp(req, res, next) {
  try {
    const { id } = req.validated.params;

    const result = await completeFollowUpService(id, req.user);

    if (result.status === "not_found") {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found",
      });
    }

    if (result.status === "already_completed") {
      return res.status(409).json({
        success: false,
        message: "Follow-up is already completed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Follow-up completed successfully",
      data: result.followUp,
    });
  } catch (error) {
    next(error);
  }
}
