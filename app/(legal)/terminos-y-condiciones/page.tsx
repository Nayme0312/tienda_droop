import type { Metadata } from "next"
import Link from "next/link"
import { LegalContactCard, LegalPage, type LegalSection } from "@/components/legal/legal-page"
import { LEGAL_INFO, SIC_URL } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Términos y condiciones | STREETVIBE",
  description:
    "Condiciones de uso de la tienda en línea STREETVIBE y de compra de sus productos, conforme al Estatuto del Consumidor colombiano.",
}

const { storeName, email, phone } = LEGAL_INFO

const SECTIONS: LegalSection[] = [
  {
    id: "identificacion",
    title: "Identificación del comercio",
    content: (
      <>
        <p>
          La tienda en línea {storeName} es operada por el responsable que se identifica a
          continuación, en cumplimiento del artículo 50 de la Ley 1480 de 2011 (Estatuto del
          Consumidor):
        </p>
        <LegalContactCard />
      </>
    ),
  },
  {
    id: "aceptacion",
    title: "Aceptación y ámbito",
    content: (
      <>
        <p>
          Estos términos regulan el uso del sitio web y la compra de los productos que se ofrecen
          en él a consumidores ubicados en Colombia. Al navegar por el sitio o realizar un pedido
          declaras que los has leído y aceptas. Si no estás de acuerdo, te pedimos no usar el
          sitio.
        </p>
        <p>
          Las compras se rigen por la Ley 1480 de 2011, la Ley 527 de 1999 (comercio electrónico),
          el Decreto 1074 de 2015 y las demás normas colombianas aplicables. Nada de lo dispuesto
          en estos términos limita o renuncia a los derechos que la ley te reconoce como
          consumidor.
        </p>
        <p>
          Para comprar debes ser mayor de edad o actuar con la autorización y supervisión de tu
          representante legal.
        </p>
      </>
    ),
  },
  {
    id: "productos",
    title: "Productos e información",
    content: (
      <>
        <p>
          Nos esforzamos para que la descripción, tallas, materiales y fotografías de cada
          producto sean veraces y suficientes. Ten en cuenta que:
        </p>
        <ul>
          <li>
            Los colores pueden verse ligeramente distintos según la pantalla y la iluminación de
            cada dispositivo.
          </li>
          <li>
            Las medidas y guías de tallas (incluida la calculadora de tallas de gorras) son
            orientativas. Si tienes dudas, escríbenos antes de comprar.
          </li>
          <li>
            La disponibilidad de cada producto y talla está sujeta a inventario. Si después de tu
            pago un producto resulta agotado, te contactaremos para ofrecerte un cambio por otra
            referencia o la devolución total del dinero, a tu elección.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "precios",
    title: "Precios y promociones",
    content: (
      <>
        <p>
          Todos los precios se expresan en pesos colombianos (COP) e incluyen los impuestos
          aplicables. De acuerdo con el artículo 26 del Estatuto del Consumidor, solo estás
          obligado a pagar el precio anunciado. El costo del envío, cuando aplique, se informa por
          separado según la{" "}
          <Link href="/politicas-de-envio-y-devoluciones#costos">política de envíos</Link>.
        </p>
        <p>
          Las promociones y descuentos indican su vigencia y condiciones, y aplican únicamente
          durante el periodo anunciado o hasta agotar las unidades informadas. El precio que se
          cobra es el que el sistema calcula al momento de iniciar el pago.
        </p>
      </>
    ),
  },
  {
    id: "compra",
    title: "Proceso de compra",
    content: (
      <>
        <ol>
          <li>Agrega los productos al carrito eligiendo talla, color y cantidad.</li>
          <li>
            En “Finalizar compra” ingresa tus datos de entrega y revisa el resumen del pedido con
            el total a pagar.
          </li>
          <li>Serás redirigido a la plataforma segura de Wompi para realizar el pago.</li>
          <li>
            Cuando el pago es aprobado, el pedido queda confirmado y verás su resumen y número de
            referencia en la página de resultado. También podremos contactarte por correo o
            WhatsApp para coordinar la entrega.
          </li>
        </ol>
        <p>
          Si el pago es rechazado o queda pendiente, el pedido no se despacha hasta que la
          entidad financiera lo apruebe. También puedes hacer tu pedido por WhatsApp; en ese caso
          te enviaremos el resumen y las instrucciones de pago por ese medio.
        </p>
      </>
    ),
  },
  {
    id: "pagos",
    title: "Medios de pago",
    content: (
      <>
        <p>
          Los pagos en línea se procesan a través de Wompi, pasarela de pagos del Grupo
          Bancolombia, con los medios que esta tenga habilitados
          (por ejemplo, tarjetas débito y crédito, PSE, Nequi o Botón Bancolombia).
        </p>
        <p>
          {storeName} no recibe ni almacena los datos de tus tarjetas o cuentas bancarias: los
          ingresas directamente en el entorno seguro de Wompi.
        </p>
      </>
    ),
  },
  {
    id: "envios-retracto-garantia",
    title: "Envíos, retracto, cambios y garantía",
    content: (
      <p>
        Los plazos y costos de envío, el derecho de retracto, los cambios y la garantía legal de
        los productos se explican en detalle en nuestra{" "}
        <Link href="/politicas-de-envio-y-devoluciones">
          Política de envíos y devoluciones
        </Link>
        , que forma parte integral de estos términos.
      </p>
    ),
  },
  {
    id: "reversion",
    title: "Reversión del pago",
    content: (
      <>
        <p>
          Conforme al artículo 51 de la Ley 1480 de 2011 y al Decreto 587 de 2016, si pagaste con
          tarjeta de crédito, débito o cualquier instrumento de pago electrónico, puedes solicitar
          la reversión del pago cuando:
        </p>
        <ul>
          <li>fuiste objeto de fraude;</li>
          <li>la operación no fue solicitada por ti;</li>
          <li>el producto no fue recibido;</li>
          <li>el producto entregado no corresponde a lo solicitado, o</li>
          <li>el producto es defectuoso.</li>
        </ul>
        <p>
          Debes presentar la solicitud dentro de los cinco (5) días hábiles siguientes a la fecha
          en que conociste la situación (o en que debías recibir el producto), dirigiéndola a{" "}
          {storeName} al correo {email} y, al mismo tiempo, al emisor del instrumento de pago
          (tu banco). Cuando proceda, deberás devolver el producto en las mismas condiciones en
          que lo recibiste.
        </p>
      </>
    ),
  },
  {
    id: "propiedad-intelectual",
    title: "Propiedad intelectual",
    content: (
      <p>
        La marca {storeName}, los logotipos, diseños de prendas, gráficos, fotografías, videos y
        textos del sitio son de nuestra propiedad o se usan con autorización, y están protegidos
        por la Ley 23 de 1982, la Decisión Andina 486 de 2000 y demás normas de propiedad
        intelectual. No está permitido copiarlos, reproducirlos o usarlos con fines comerciales
        sin autorización previa y por escrito.
      </p>
    ),
  },
  {
    id: "uso",
    title: "Uso adecuado del sitio",
    content: (
      <>
        <p>Al usar el sitio te comprometes a no:</p>
        <ul>
          <li>suministrar información falsa o de terceros sin su autorización;</li>
          <li>
            intentar acceder a áreas restringidas, alterar el funcionamiento del sitio o eludir
            sus medidas de seguridad;
          </li>
          <li>usar robots u otros medios automáticos para extraer información o hacer pedidos;</li>
          <li>usar el sitio para fines ilícitos o contrarios a estos términos.</li>
        </ul>
        <p>
          Podremos cancelar pedidos asociados a fraude o suplantación comprobados, devolviendo
          cualquier valor pagado.
        </p>
      </>
    ),
  },
  {
    id: "responsabilidad",
    title: "Responsabilidad",
    content: (
      <p>
        Respondemos por la calidad, idoneidad y seguridad de los productos que vendemos en los
        términos del Estatuto del Consumidor. No somos responsables por interrupciones del sitio
        causadas por fuerza mayor, fallas de proveedores de internet o mantenimientos
        programados, ni por el contenido de sitios de terceros enlazados (por ejemplo, redes
        sociales o la pasarela de pagos), sin perjuicio de los derechos que la ley te reconoce.
      </p>
    ),
  },
  {
    id: "datos",
    title: "Datos personales",
    content: (
      <p>
        El tratamiento de tus datos personales se rige por nuestra{" "}
        <Link href="/politica-de-privacidad">Política de privacidad y tratamiento de datos</Link>
        , conforme a la Ley 1581 de 2012.
      </p>
    ),
  },
  {
    id: "pqr",
    title: "Peticiones, quejas y reclamos",
    content: (
      <>
        <p>
          Puedes radicar peticiones, quejas o reclamos (PQR) al correo <strong>{email}</strong> o
          por WhatsApp al <strong>{phone}</strong>, indicando tu nombre, número de pedido y la
          descripción de tu solicitud. Te responderemos dentro de los quince (15) días hábiles
          siguientes a su recibo.
        </p>
        <p>
          Si no quedas satisfecho con la respuesta, puedes acudir a la Superintendencia de
          Industria y Comercio (
          <a href={SIC_URL} target="_blank" rel="noopener noreferrer">
            www.sic.gov.co
          </a>
          ), autoridad de protección al consumidor en Colombia.
        </p>
      </>
    ),
  },
  {
    id: "cambios-terminos",
    title: "Modificaciones",
    content: (
      <p>
        Podemos actualizar estos términos para reflejar cambios legales u operativos. La versión
        vigente es la publicada en esta página, con su fecha de actualización. Los pedidos ya
        realizados se rigen por los términos vigentes al momento de la compra.
      </p>
    ),
  },
  {
    id: "ley",
    title: "Ley aplicable y jurisdicción",
    content: (
      <p>
        Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia
        podrá resolverse directamente con nosotros o ante la Superintendencia de Industria y
        Comercio, en ejercicio de sus funciones jurisdiccionales, o ante los jueces competentes
        de Colombia.
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      href="/terminos-y-condiciones"
      intro={
        <p>
          Gracias por comprar en {storeName}. Aquí explicamos de forma clara las reglas de uso de
          nuestra tienda en línea y las condiciones de compra de nuestras camisas, gorras y
          accesorios streetwear.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
