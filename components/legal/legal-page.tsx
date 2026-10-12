import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { LEGAL_INFO, LEGAL_PAGES } from "@/lib/legal"

export interface LegalSection {
  /** Ancla de la seccion (#id), usada por el indice. */
  id: string
  title: string
  content: React.ReactNode
}

interface LegalPageProps {
  title: string
  /** Ruta de la pagina, para no enlazarse a si misma al final. */
  href: string
  intro: React.ReactNode
  sections: LegalSection[]
}

/**
 * Plantilla de las paginas legales: cabecera, indice (fijo al lado en
 * escritorio) y secciones numeradas. El indice sale del mismo array que las
 * secciones, asi nunca se desincronizan.
 */
export function LegalPage({ title, href, intro, sections }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <header className="mb-10 max-w-3xl">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la tienda
        </Link>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Legal
        </p>
        <h1 className="text-balance text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-xs text-muted-foreground">
          Última actualización: {LEGAL_INFO.lastUpdated}
        </p>
        <div className="mt-6 text-sm leading-relaxed text-muted-foreground md:text-base">{intro}</div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-14">
        {/* Indice */}
        <nav aria-label="Contenido" className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Contenido</p>
            <ol className="space-y-2 text-sm">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="tabular-nums text-foreground/40">{i + 1}.</span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="min-w-0 max-w-3xl space-y-10">
          {sections.map((section, i) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2 className="mb-4 flex gap-3 text-lg font-bold uppercase tracking-wider text-foreground">
                <span className="tabular-nums text-foreground/40">{String(i + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>
              <div
                className={cn(
                  "space-y-3 text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]",
                  "[&_strong]:font-semibold [&_strong]:text-foreground",
                  "[&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/30 [&_a]:underline-offset-4 [&_a:hover]:decoration-foreground",
                  "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
                  "[&_li]:marker:text-foreground/40",
                )}
              >
                {section.content}
              </div>
            </section>
          ))}

          {/* Otras paginas legales */}
          <aside className="rounded-xl border border-border bg-card/50 p-5 sm:p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
              También te puede interesar
            </p>
            <ul className="flex flex-wrap gap-2">
              {LEGAL_PAGES.filter((page) => page.href !== href).map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className="inline-block rounded-full border border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </article>
      </div>
    </div>
  )
}

/** Bloque de datos de contacto del responsable, comun a las tres paginas. */
export function LegalContactCard() {
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-card/50 p-5 text-sm sm:grid-cols-[auto_1fr]">
      {[
        ["Responsable", LEGAL_INFO.legalName],
        ["NIT / C.C.", LEGAL_INFO.taxId],
        ["Dirección", `${LEGAL_INFO.address}, ${LEGAL_INFO.city}`],
        ["Correo", LEGAL_INFO.email],
        ["Teléfono / WhatsApp", LEGAL_INFO.phone],
        ["Horario de atención", LEGAL_INFO.supportHours],
      ].map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-semibold text-foreground">{label}</dt>
          <dd className="break-words text-muted-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
