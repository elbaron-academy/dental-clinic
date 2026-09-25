import type { Role } from '../api/types'

export interface RoleInfo {
  role: Role
  label: string
  /** URL segment of the role's login page and home. */
  slug: 'doctor' | 'assistant' | 'reception'
  home: string
  login: string
  description: string
}

export const ROLES: Record<Role, RoleInfo> = {
  DOCTOR: {
    role: 'DOCTOR',
    label: 'Doctor',
    slug: 'doctor',
    home: '/doctor',
    login: '/login/doctor',
    description: 'Your queue, active visits and patient history.',
  },
  ASSISTANT: {
    role: 'ASSISTANT',
    label: 'Assistant',
    slug: 'assistant',
    home: '/assistant',
    login: '/login/assistant',
    description: 'Patients and queues of the doctors you assist.',
  },
  RECEPTIONIST: {
    role: 'RECEPTIONIST',
    label: 'Receptionist',
    slug: 'reception',
    home: '/reception',
    login: '/login/reception',
    description: 'Registration, appointments, check-in and payments.',
  },
}

export const ROLE_LIST: RoleInfo[] = [ROLES.DOCTOR, ROLES.ASSISTANT, ROLES.RECEPTIONIST]

export function roleBySlug(slug: string | undefined): RoleInfo | undefined {
  return ROLE_LIST.find((info) => info.slug === slug)
}
