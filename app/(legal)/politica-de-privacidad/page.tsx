import type { Metadata } from "next"
import { LegalContactCard, LegalPage, type LegalSection } from "@/components/legal/legal-page"
import { LEGAL_INFO, SIC_URL } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Política de privacidad | STREETVIBE",
  description:
    "Política de tratamiento de datos personales de STREETVIBE conforme a la Ley 1581 de 2012 (Habeas Data).",
}

const { storeName, email, phone } = LEGAL_INFO

const SECTIONS: LegalSection[] = [
  {
    id: "responsable",
    title: "Responsable del tratamiento",
    content: (
      <>
        <p>
          El responsable del tratamiento de tus datos personales es el titular de {storeName},
          identificado así:
        </p>
        <LegalContactCard />
        <p>
          Esta misma área atiende las consultas y reclamos sobre datos personales a través de los
          canales indicados.
        </p>
      </>
    ),
  },
  {
    id: "marco-legal",
    title: "Marco legal",
    content: (
      <p>
        Esta política se expide en cumplimiento del artículo 15 de la Constitución Política, la
        Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 (incorporado en el Decreto Único
        1074 de 2015) y demás normas que las modifiquen o complementen. Aplica a los datos
        personales que recolectamos a través de nuestro sitio web, WhatsApp y redes sociales.
      </p>
    ),
  },
  {
    id: "datos",
    title: "Datos que recolectamos",
    content: (
      <>
        <ul>
          <li>
            <strong>Al comprar:</strong> nombre completo, correo electrónico, teléfono, dirección
            de entrega, ciudad, departamento, las notas que quieras agregar y el detalle de tu
            pedido.
          </li>
          <li>
            <strong>Al suscribirte al boletín:</strong> tu correo electrónico.
          </li>
          <li>
            <strong>Al escribirnos por WhatsApp o correo:</strong> tu número, nombre y el
            contenido de la conversación.
          </li>
          <li>
            <strong>Al navegar:</strong> datos técnicos y estadísticas de uso agregadas (páginas
            visitadas, tipo de dispositivo, país), y una verificación anti-bots en los
            formularios.
          </li>
        </ul>
        <p>
          <strong>No recolectamos datos sensibles</strong> (como origen racial, salud, orientación
          sexual o datos biométricos) ni datos de tarjetas o cuentas bancarias: los pagos se
          realizan directamente en la plataforma de Wompi.
        </p>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "Finalidades del tratamiento",
    content: (
      <>
        <p>Usamos tus datos para:</p>
        <ol>
          <li>Procesar, cobrar, despachar y entregar tus pedidos.</li>
          <li>
            Comunicarnos contigo sobre el estado de tu pedido, envíos, cambios, garantías y
            devoluciones.
          </li>
          <li>Atender tus peticiones, quejas, reclamos y solicitudes de soporte.</li>
          <li>Emitir facturas y cumplir obligaciones contables, tributarias y legales.</li>
          <li>Prevenir fraudes y proteger la seguridad del sitio.</li>
          <li>
            Si lo autorizas al suscribirte, enviarte novedades, lanzamientos y promociones. Puedes
            cancelar la suscripción en cualquier momento.
          </li>
          <li>Medir el uso del sitio de forma agregada para mejorar la experiencia de compra.</li>
        </ol>
        <p>No vendemos ni alquilamos tus datos personales a terceros.</p>
      </>
    ),
  },
  {
    id: "autorizacion",
    title: "Autorización",
    content: (
      <p>
        Al diligenciar el formulario de compra, suscribirte al boletín o escribirnos, y después de
        haber sido informado de esta política, nos otorgas tu autorización previa, expresa e
        informada para tratar tus datos según las finalidades descritas, mediante una conducta
        inequívoca (artículo 7 del Decreto 1377 de 2013). Conservamos prueba de dicha
        autorización. No se requiere autorización para datos de naturaleza pública ni en los
        demás casos del artículo 10 de la Ley 1581 de 2012.
      </p>
    ),
  },
  {
    id: "derechos",
    title: "Tus derechos",
    content: (
      <>
        <p>Como titular de los datos tienes derecho a:</p>
        <ul>
          <li>Conocer, actualizar y rectificar tus datos personales.</li>
          <li>Solicitar prueba de la autorización otorgada.</li>
          <li>Ser informado sobre el uso que se ha dado a tus datos.</li>
          <li>
            Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a
            la ley, una vez agotado el trámite ante nosotros.
          </li>
          <li>
            Revocar la autorización o solicitar la supresión de tus datos, cuando no exista un
            deber legal o contractual de conservarlos.
          </li>
          <li>Acceder gratuitamente a tus datos personales.</li>
        </ul>
      </>
    ),
  },
  {
    id: "procedimiento",
    title: "Consultas y reclamos",
    content: (
      <>
        <p>
          Puedes ejercer tus derechos escribiendo a <strong>{email}</strong> o por WhatsApp al{" "}
          <strong>{phone}</strong>. Incluye tu nombre, documento de identidad, datos de contacto,
          la descripción de tu solicitud y, si aplica, los documentos que la soporten. Si actúas
          en nombre de otra persona, acredita tu representación.
        </p>
        <ul>
          <li>
            <strong>Consultas:</strong> se responden en un máximo de diez (10) días hábiles desde
            su recibo. Si no es posible, te informaremos el motivo y la nueva fecha, que no
            superará cinco (5) días hábiles adicionales (artículo 14, Ley 1581 de 2012).
          </li>
          <li>
            <strong>Reclamos</strong> (corrección, actualización, supresión o revocatoria): se
            resuelven en un máximo de quince (15) días hábiles, prorrogables hasta ocho (8) días
            hábiles más, informándote el motivo. Si el reclamo está incompleto, te pediremos
            completarlo dentro de los cinco (5) días siguientes; si pasan dos (2) meses sin
            respuesta, se entenderá desistido (artículo 15, Ley 1581 de 2012).
          </li>
        </ul>
        <p>
          Solo podrás elevar queja ante la Superintendencia de Industria y Comercio (
          <a href={SIC_URL} target="_blank" rel="noopener noreferrer">
            www.sic.gov.co
          </a>
          ) una vez hayas agotado este trámite de consulta o reclamo (artículo 16).
        </p>
      </>
    ),
  },
  {
    id: "terceros",
    title: "Encargados y transferencias",
    content: (
      <>
        <p>
          Para operar la tienda compartimos los datos estrictamente necesarios con proveedores que
          actúan como encargados del tratamiento, bajo acuerdos que les exigen protegerlos y
          usarlos solo para el servicio contratado:
        </p>
        <ul>
          <li>
            <strong>Wompi</strong>: procesamiento de pagos.
          </li>
          <li>
            <strong>Empresas transportadoras</strong>: entrega de pedidos (nombre, teléfono y
            dirección).
          </li>
          <li>
            <strong>Proveedores de alojamiento web, envío de correos (Resend), estadísticas de uso
            (Vercel) y protección anti-bots (Cloudflare)</strong>: funcionamiento y seguridad del
            sitio.
          </li>
          <li>
            <strong>WhatsApp (Meta)</strong>: cuando decides comunicarte con nosotros por ese
            medio.
          </li>
        </ul>
        <p>
          Algunos de estos proveedores tienen servidores fuera de Colombia, por lo que tus datos
          pueden ser objeto de transmisión internacional a países como Estados Unidos. Esta se
          realiza conforme al artículo 26 de la Ley 1581 de 2012 y al Decreto 1074 de 2015, con
          contratos que garantizan un nivel adecuado de protección. Al aceptar esta política
          autorizas dicha transmisión.
        </p>
        <p>
          También podremos entregar datos a autoridades que los soliciten en ejercicio de sus
          funciones legales.
        </p>
      </>
    ),
  },
  {
    id: "seguridad",
    title: "Seguridad y conservación",
    content: (
      <>
        <p>
          Aplicamos medidas técnicas, humanas y administrativas razonables para proteger tus datos
          contra pérdida, consulta, uso o acceso no autorizado: conexión cifrada (HTTPS), acceso
          restringido al panel administrativo y proveedores con estándares reconocidos de
          seguridad.
        </p>
        <p>
          Conservamos tus datos solo durante el tiempo necesario para cumplir las finalidades
          descritas y los plazos legales (por ejemplo, los documentos contables se conservan por
          el término que exige la ley comercial y tributaria). Los datos del boletín se conservan
          hasta que canceles tu suscripción.
        </p>
      </>
    ),
  },
  {
    id: "menores",
    title: "Menores de edad",
    content: (
      <p>
        Nuestro sitio está dirigido a mayores de edad. No recolectamos intencionalmente datos de
        niños, niñas o adolescentes. Si un menor realiza una compra, debe hacerlo con la
        autorización de su representante legal, y su tratamiento respetará el interés superior
        del menor y sus derechos fundamentales (artículo 7, Ley 1581 de 2012).
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies y almacenamiento local",
    content: (
      <>
        <p>
          Usamos el almacenamiento de tu navegador para funciones necesarias de la tienda, como
          guardar tu carrito, recordar tus preferencias (por ejemplo, la posición del botón de
          WhatsApp) y no repetirte avisos que ya cerraste. No usamos cookies publicitarias de
          terceros.
        </p>
        <p>
          Las estadísticas de uso se recogen de forma agregada y sin identificarte
          personalmente. Puedes borrar o bloquear el almacenamiento desde la configuración de tu
          navegador, aunque algunas funciones (como el carrito) podrían dejar de funcionar.
        </p>
      </>
    ),
  },
  {
    id: "vigencia",
    title: "Vigencia y cambios",
    content: (
      <p>
        Esta política rige desde su fecha de publicación y las bases de datos se mantendrán
        mientras subsistan las finalidades descritas. Cualquier cambio sustancial se publicará en
        esta página y, cuando corresponda, se te informará por correo antes de aplicarse.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      href="/politica-de-privacidad"
      intro={
        <p>
          En {storeName} respetamos tu privacidad. Esta política explica qué datos personales
          recolectamos, para qué los usamos, con quién los compartimos y cómo puedes ejercer tus
          derechos de Habeas Data.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
