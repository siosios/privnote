import type { Messages, Note, ResponseBody } from '$lib/@types';
import type { Actions, Redirect, RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

import { client, getCsrfToken } from '$lib/utils/server';
import { deepMerge } from '$lib/utils';
import { COOKIE } from '$lib/utils/server/constants';
import { DeleteNoteSchema } from '$lib/schemas/deleteNote.schema';
import type { PageServerLoad } from '../$types';

export const load = (async (options: RequestEvent): Promise<ResponseBody | Redirect | void> => {
  if (!options.params?.id) throw redirect(307, '/');

  try {
    const body = await (
      await client<ResponseBody<{ note: Note; alert: string }>>(`note/${options.params.id}`, {
        method: 'GET'
      })
    ).body.json();

    const captcha = await getCsrfToken(options);

    return deepMerge(body, captcha);
  } catch (err) {
    // throw redirect(307, '/');
    return { messages: [{ message: JSON.stringify(err), path: 'error' }] };
  }
}) satisfies PageServerLoad;

export const actions = {
  default: async ({ request, cookies }): Promise<ResponseBody | Redirect> => {
    const form = Object.fromEntries(await request.formData());
    try {
      const text = cookies.get(COOKIE);

      const body = JSON.stringify(DeleteNoteSchema.parse({ ...form, text }));

      console.log(body);

      const res = await (
        await client<ResponseBody<boolean>>(`note`, {
          method: 'DELETE',
          body
        })
      ).body.json();

      return res;
    } catch (err) {
      return {
        messages: [
          {
            message: JSON.stringify(err),
            path: 'error',
            ...Object.keys(form).map((k) => ({ path: k, value: form[k] }) as Messages)
          }
        ]
      };
    }
  }
} satisfies Actions;