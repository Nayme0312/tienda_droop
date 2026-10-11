/**
 * Categorias (secciones de tienda) del panel.
 *
 * Ya no hay una lista fija: las categorias viven en PostgreSQL y el panel las
 * lee con useCategories() (components/admin/categories-provider.tsx). En los
 * tipos, `CategoryId` es el SLUG de la categoria, el identificador estable que
 * usan la API y las URLs.
 */
export type CategoryId = string
