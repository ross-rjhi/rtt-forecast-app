// The app's sections, in navbar order. Each path has a page in src/pages/ (e.g. /overview -> overview.vue).
// `ready: false` marks a placeholder: it's in the navbar, but its page just says it's coming.
// `pages` gives a section sub-pages, shown as a second row of tabs under the navbar while you're in
// that section. Each sub-page is its own file (e.g. /overview/detail -> overview.detail.vue).

export interface SubPage {
  path: string
  label: string
}

export interface Section {
  path: string
  label: string // navbar text
  title: string // full name, for the page and tooltips
  ready: boolean
  pages?: SubPage[]
}

export const SECTIONS: Section[] = [
  {
    path: '/overview',
    label: 'Overview',
    title: 'Overview',
    ready: true,
    pages: [
      { path: '/overview', label: 'Dashboard' },
      { path: '/overview/detail', label: 'Detail' },
    ],
  },
  { path: '/reports', label: 'Reports', title: 'Reports', ready: false },
  { path: '/settings', label: 'Settings', title: 'Settings', ready: false },
]

// The section a path belongs to: /overview and /overview/detail are both in Overview.
export function sectionFor(path: string): Section | undefined {
  return SECTIONS.find((s) => path === s.path || path.startsWith(`${s.path}/`))
}

// Where "/" goes.
export const DEFAULT_SECTION = '/overview'
