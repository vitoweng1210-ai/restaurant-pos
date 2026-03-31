import type { StaffRole } from '@/lib/types'

export function canAccessPos(role?: StaffRole) {
  return role === 'staff' || role === 'manager' || role === 'admin'
}

export function canAccessKitchen(role?: StaffRole) {
  return role === 'staff' || role === 'manager' || role === 'admin'
}

export function canManageOrders(role?: StaffRole) {
  return role === 'manager' || role === 'admin'
}

export function canManageMenu(role?: StaffRole) {
  return role === 'manager' || role === 'admin'
}

export function canManageTables(role?: StaffRole) {
  return role === 'manager' || role === 'admin'
}

export function canManageStaff(role?: StaffRole) {
  return role === 'admin'
}

export function canAccessAdmin(role?: StaffRole) {
  return role === 'manager' || role === 'admin'
}