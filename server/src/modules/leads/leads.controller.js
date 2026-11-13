import {
  createLead as createLeadService,
  getLeads as getLeadsService,
  getLeadById as getLeadByIdService,
  updateLead as updateLeadService,
  deleteLead as deleteLeadService,
} from "./leads.service.js";

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

export async function getLeads(req, res, next) {
  try {
    // 1. Get validated query parameters.
    const filters = req.validated.query;

    // 2. Get the authenticated user.
    const user = req.user;

    // 3. Ask the service to fetch permitted leads.
    const result = await getLeadsService(filters, user);

    // 4. Send the result.
    return res.status(200).json({
      success: true,
      message: "Leads fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLeadById(req, res, next) {
  try {
    const { id } = req.validated.params;
    const user = req.user;

    const lead = await getLeadByIdService(id, user);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead fetched successfully",
      data: lead,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLead(req, res, next) {
  try {
    const { id } = req.validated.params;
    const data = req.validated.body;
    const user = req.user;

    const result = await updateLeadService(id, data, user);

    if (result?.status === "forbidden") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to change the project",
      });
    }

    if (result?.status === "project_not_found") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteLead(req, res, next) {
  try {
    const { id } = req.validated.params;
    const user = req.user;

    const lead = await deleteLeadService(id, user);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
