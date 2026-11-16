import { getDashboard as getDashboardService } from "./dashboard.service.js";

export async function getDashboard(req, res, next) {
  try {
    const dashboard = await getDashboardService(req.user);

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
}
