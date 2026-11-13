import {
  createProject as createProjectService,
  getProjects as getProjectsService,
  getProjectById as getProjectByIdService,
  updateProject as updateProjectService,
} from "./projects.service.js";

export async function createProject(req, res, next) {
  try {
    const data = req.validated.body;

    const project = await createProjectService(data, req.user);

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjects(req, res, next) {
  try {
    const filters = req.validated.query;

    const result = await getProjectsService(filters, req.user);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjectById(req, res, next) {
  try {
    const { id } = req.validated.params;

    const project = await getProjectByIdService(id, req.user);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req, res, next) {
  try {
    const { id } = req.validated.params;
    const data = req.validated.body;

    const project = await updateProjectService(id, data, req.user);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
}
