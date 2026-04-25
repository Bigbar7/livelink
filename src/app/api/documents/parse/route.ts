import { badRequest, ok, serverError } from '@/lib/http';
import { parseDocumentFile } from '@/services/document-parser-service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return badRequest('Malformed form data');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return badRequest('Document file is required');
  }

  try {
    return ok(await parseDocumentFile(file));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Document parsing failed';
    if (message === 'Unsupported document type' || message === 'Document is too large') {
      return badRequest(message);
    }
    return serverError(message);
  }
}
