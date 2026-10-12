import { Resend } from 'resend'

/**
 * Email de bienvenida del boletin, enviado con Resend.
 *
 * Solo se usa en el servidor: RESEND_API_KEY no lleva NEXT_PUBLIC_ y nunca
 * llega al navegador. Si la llave no esta definida no se lanza ningun error:
 * el suscriptor ya quedo guardado y la bienvenida simplemente no se envia
 * (queda welcomeSentAt = null para poder reenviarla mas adelante).
 */
const DEFAULT_FROM = 'STREETVIBE <onboarding@resend.dev>'

let client: Resend | null = null

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return null
  client ??= new Resend(apiKey)
  return client
}

function welcomeHtml(siteUrl: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#fafafa;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#141414;border:1px solid #262626;border-radius:12px;padding:40px 32px;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <span style="display:inline-block;border:1px solid #fafafa;padding:6px 12px;font-size:16px;font-weight:bold;letter-spacing:4px;">STREETVIBE</span>
              </td>
            </tr>
            <tr>
              <td style="font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;text-align:center;padding-bottom:16px;">
                Bienvenido al Movimiento
              </td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.6;color:#a3a3a3;text-align:center;padding-bottom:28px;">
                Gracias por suscribirte. Desde ahora seras de los primeros en enterarte
                de nuestros lanzamientos, ofertas exclusivas y contenido unico.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:12px;">
                <a href="${siteUrl}" style="display:inline-block;background:#fafafa;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;padding:14px 28px;border-radius:8px;">
                  Ver la tienda
                </a>
              </td>
            </tr>
          </table>
          <p style="font-size:12px;color:#525252;padding-top:20px;margin:0;">
            Recibes este correo porque te suscribiste en STREETVIBE.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function welcomeText(siteUrl: string): string {
  return [
    'BIENVENIDO AL MOVIMIENTO',
    '',
    'Gracias por suscribirte a STREETVIBE. Desde ahora seras de los primeros en',
    'enterarte de nuestros lanzamientos, ofertas exclusivas y contenido unico.',
    '',
    `Ver la tienda: ${siteUrl}`,
  ].join('\n')
}

/**
 * Envia la bienvenida. Devuelve true si Resend acepto el envio y false si no
 * esta configurado o fallo; nunca lanza, para que un problema con el proveedor
 * no haga fallar la suscripcion.
 *
 * `subscriberId` se usa como clave de idempotencia: si la peticion se repite,
 * Resend no manda el correo dos veces.
 */
export async function sendWelcomeEmail(params: {
  to: string
  subscriberId: string
  siteUrl: string
}): Promise<boolean> {
  const resend = getClient()
  if (!resend) {
    console.warn('[newsletter] RESEND_API_KEY no esta definida: no se envia la bienvenida.')
    return false
  }

  try {
    const { error } = await resend.emails.send(
      {
        from: process.env.RESEND_FROM?.trim() || DEFAULT_FROM,
        to: [params.to],
        subject: 'Bienvenido al Movimiento | STREETVIBE',
        html: welcomeHtml(params.siteUrl),
        text: welcomeText(params.siteUrl),
      },
      { idempotencyKey: `newsletter-welcome/${params.subscriberId}` },
    )

    if (error) {
      console.error('[newsletter] Resend rechazo el envio:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('[newsletter] Error enviando la bienvenida:', error)
    return false
  }
}
