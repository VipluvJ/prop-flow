import { createLead as createLeadService } from "./leads.service.js";

export async function createLead(req, res, next) {
  try {
    const data = req.validated.body;

    const lead = await createLeadService(data, req.user);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    next(error);
  }
}
