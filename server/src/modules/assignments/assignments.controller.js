import { assignLead as assignLeadService } from "./assignments.service.js";

export async function assignLead(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { agentId } = req.validated.body;

    const result = await assignLeadService(id, agentId, req.user);

    if (result.status === "agent_not_found") {
      return res.status(404).json({
        success: false,
        message: "Agent not found in your organization",
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
        message: "Cannot assign a lead to an inactive agent",
      });
    }

    if (result.status === "lead_not_found") {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (result.status === "already_assigned") {
      return res.status(409).json({
        success: false,
        message: "Lead is already assigned to this agent",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead assigned successfully",
      data: result.lead,
    });
  } catch (error) {
    next(error);
  }
}
