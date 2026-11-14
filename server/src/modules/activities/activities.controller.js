import {
  createActivity as createActivityService,
  getLeadActivities as getLeadActivitiesService,
} from "./activities.service.js";

// CREATE ACTIVITY
export async function createActivity(req, res, next) {
  try {
    const { id } = req.validated.params;
    const data = req.validated.body;

    const activity = await createActivityService(id, data, req.user);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Activity created successfully",
      data: activity,
    });
  } catch (error) {
    next(error);
  }
}

// GET LEAD ACTIVITIES
export async function getLeadActivities(req, res, next) {
  try {
    const { id } = req.validated.params;

    const activities = await getLeadActivitiesService(id, req.user);

    if (!activities) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
}
