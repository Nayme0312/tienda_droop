import type { Metadata } from "next"
import Link from "next/link"
import { LegalContactCard, LegalPage, type LegalSection } from "@/components/legal/legal-page"
import { LEGAL_INFO } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Envíos y devoluciones | STREETVIBE",
  description:
    "Plazos y costos de envío, derecho de retracto, cambios y garantía legal de los productos STREETVIBE en Colombia.",
}

const {
  storeName,
  email,
  phone,
  dispatchDays,
  deliveryMainCities,
  deliveryOtherAreas,
  shippingCost,
  exchangeDays,
  warrantyTerm,
} = LEGAL_INFO

const SECTIONS: LegalSection[] = [
  {
    id: "cobertura",
    title: "Cobertura",
    content: (
      <p>
        Realizamos envíos a todo el territorio colombiano a través de empresas transportadoras
        aliadas. En zonas rurales o de difícil acceso la entrega puede tardar más o realizarse en
        la oficina de la transportadora más cercana; si es tu caso, te lo informaremos antes de
        despachar.
      </p>
    ),
  },
  {
    id: "tiempos",
    title: "Tiempos de entrega",
    content: (
      <>
        <ul>
          <li>
            <strong>Alistamiento:</strong> {dispatchDays} después de aprobado el pago.
          </li>
          <li>
            <strong>Ciudades principales:</strong> {deliveryMainCities} a partir del despacho.
          </li>
          <li>
            <strong>Otros municipios y zonas especiales:</strong> {deliveryOtherAreas} a partir del
            despacho.
          </li>
        </ul>
        <p>
          Son plazos estimados y no incluyen domingos ni festivos. Pueden extenderse por causas
          ajenas a nosotros (paros, orden público, clima, temporadas de alto volumen). En ningún
          caso la entrega superará los treinta (30) días calendario desde la compra; si no
          podemos cumplir, podrás pedir la devolución total del dinero.
        </p>
      </>
    ),
  },
  {
    id: "costos",
    title: "Costos de envío",
    content: <p>{shippingCost}</p>,
  },
  {
    id: "recepcion",
    title: "Seguimiento y recepción",
    content: (
      <>
        <p>
          Cuando despachemos tu pedido te enviaremos la transportadora y el número de guía para que
          puedas hacerle seguimiento. Asegúrate de que la dirección y el teléfono sean correctos:
          si el envío regresa por datos errados o porque no hubo quien lo recibiera, el nuevo
          envío tendrá un costo adicional.
        </p>
        <p>
          Al recibir, revisa que el paquete esté sellado y en buen estado. Si notas daños o el
          contenido no corresponde a tu pedido, déjalo anotado en la guía de la transportadora y
          escríbenos con fotos lo antes posible (idealmente dentro de las 48 horas siguientes)
          para solucionarlo rápidamente. Esto no limita tu derecho a la garantía legal.
        </p>
      </>
    ),
  },
  {
    id: "retracto",
    title: "Derecho de retracto",
    content: (
      <>
        <p>
          Como tu compra es una venta a distancia, el artículo 47 de la Ley 1480 de 2011 te da
          derecho a retractarte de ella, sin necesidad de explicar el motivo, dentro de los{" "}
          <strong>cinco (5) días hábiles siguientes a la entrega</strong> del producto.
        </p>
        <ul>
          <li>
            Escríbenos a {email} o por WhatsApp al {phone} indicando tu número de pedido y que
            deseas ejercer el retracto.
          </li>
          <li>
            Devuelve el producto en las mismas condiciones en que lo recibiste: sin uso, sin
            lavar, con etiquetas y empaque original.
          </li>
          <li>
            Los costos de transporte y demás que conlleve la devolución corren por tu cuenta, como
            lo establece la ley.
          </li>
          <li>
            Te reintegraremos la totalidad del dinero pagado, sin descuentos ni retenciones, en
            un plazo máximo de treinta (30) días calendario desde que ejerciste el retracto.
          </li>
        </ul>
        <p>
          De acuerdo con la misma norma, no aplica el retracto a productos confeccionados
          conforme a tus especificaciones o claramente personalizados (por ejemplo, con nombres o
          diseños hechos a pedido).
        </p>
      </>
    ),
  },
  {
    id: "cambios",
    title: "Cambios por talla o referencia",
    content: (
      <>
        <p>
          Además de lo que exige la ley, si la talla no te quedó o prefieres otro color o
          referencia, puedes solicitar un cambio dentro de los{" "}
          <strong>{exchangeDays} siguientes a la entrega</strong>, con estas condiciones:
        </p>
        <ul>
          <li>El producto no debe haber sido usado ni lavado, y debe conservar sus etiquetas.</li>
          <li>Se entrega en su empaque original y con el comprobante o número de pedido.</li>
          <li>
            El cambio está sujeto a disponibilidad. Si el nuevo producto tiene un precio mayor,
            pagas la diferencia; si es menor, te la reconocemos como saldo a favor.
          </li>
          <li>
            Los costos de envío del cambio corren por tu cuenta, salvo que el cambio se deba a un
            error nuestro (talla, color o producto equivocado), en cuyo caso los asumimos
            nosotros.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "garantia",
    title: "Garantía legal",
    content: (
      <>
        <p>
          Todos nuestros productos cuentan con garantía legal de calidad, idoneidad y seguridad
          (artículos 7 a 11 y 58 de la Ley 1480 de 2011) por un término de{" "}
          <strong>{warrantyTerm} contados desde la entrega</strong>. Cubre defectos de
          fabricación como costuras que se sueltan, estampados o bordados que se desprenden o
          agrietan con el uso normal, cierres o broches defectuosos y fallas en los materiales.
        </p>
        <p>
          <strong>Cómo solicitarla:</strong> escríbenos con tu número de pedido, una descripción
          del problema y fotos del producto. Responderemos dentro de los quince (15) días hábiles
          siguientes. Si procede, según el caso repararemos el producto, lo cambiaremos por uno
          igual o de similares características, o te devolveremos el dinero. Los costos de
          transporte para hacer efectiva la garantía corren por nuestra cuenta.
        </p>
        <p>
          La garantía no aplica cuando el daño se debe a fuerza mayor o caso fortuito, al hecho
          de un tercero, al uso indebido del producto o a no seguir las instrucciones de cuidado
          y lavado indicadas en la etiqueta (artículo 16 de la Ley 1480 de 2011). El desgaste
          natural por el uso tampoco se considera un defecto.
        </p>
      </>
    ),
  },
  {
    id: "reembolsos",
    title: "Reembolsos",
    content: (
      <p>
        Cuando corresponda devolver dinero (retracto, garantía, producto agotado o pedido no
        entregado), lo haremos por el mismo medio de pago utilizado o, si no es posible, por
        transferencia a la cuenta que nos indiques a tu nombre. El tiempo en que el dinero se
        refleja depende de tu banco o entidad financiera. Si pagaste con un medio electrónico,
        también puedes solicitar la{" "}
        <Link href="/terminos-y-condiciones#reversion">reversión del pago</Link> en los casos que
        prevé la ley.
      </p>
    ),
  },
  {
    id: "contacto",
    title: "Cómo iniciar una solicitud",
    content: (
      <>
        <p>
          Para cualquier cambio, devolución, retracto o garantía, escríbenos con tu número de
          pedido. En {storeName} te guiaremos en cada paso:
        </p>
        <LegalContactCard />
      </>
    ),
  },
]

export default function ShippingReturnsPage() {
  return (
    <LegalPage
      title="Envíos y devoluciones"
      href="/politicas-de-envio-y-devoluciones"
      intro={
        <p>
          Queremos que tu pedido llegue rápido y que ames lo que compraste. Aquí encuentras cómo
          enviamos, y cómo funcionan el derecho de retracto, los cambios y la garantía legal de
          acuerdo con el Estatuto del Consumidor (Ley 1480 de 2011).
        </p>
      }
      sections={SECTIONS}
    />
  )
}
