/** Shared shape for every bundled icon library's data file -- see
 *  editor/iconLibraries.ts for the registry that ties a library id to
 *  its viewBox/render-mode metadata and one of these arrays. */
export type IconEntry = readonly [name: string, tags: readonly string[], svg: string]
