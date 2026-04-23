import { requireUser } from '../../../../lib/auth';
import { listTrashForUser } from '../../../../lib/sites/service';
import { errorResponse, json } from '../../../../lib/api/respond';

// GET: list soft-deleted sites in the caller's active team.
export async function GET() {
  try {
    const user = await requireUser();
    const sites = await listTrashForUser(user);
    return json({ sites });
  } catch (err) {
    return errorResponse(err);
  }
}
