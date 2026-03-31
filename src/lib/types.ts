export type StaffRole = 'staff' | 'manager' | 'admin'

export type SessionStaff = {
  id: string
  name: string
  email: string
  role: StaffRole
}

export type StaffRow = {
  id: string
  name: string | null
  email: string
  password: string
  role: StaffRole
  created_at: string
}

export type TableRow = {
  id: string
  name: string
  status: 'available' | 'occupied' | 'dirty' | string
}

export type CategoryRow = {
  id: string
  name: string
}

export type MenuStation = 'main' | 'side' | 'dessert_drink' | string

export type MenuRow = {
  id: string
  name: string
  price: number
  category_id: string | null
  is_active: boolean
  station?: MenuStation
}

export type OrderStatus =
  | 'new'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'paid'
  | string

export type OrderRow = {
  id: string
  table_id: string | null
  status: OrderStatus
  total: number
  created_at: string
}

export type OrderItemRow = {
  id: string
  order_id: string
  menu_id: string
  qty: number
  price: number
}

export type OrderListItem = {
  id: string
  table_id: string | null
  table_name: string
  status: OrderStatus
  total: number
  created_at: string
  items: Array<{
    id: string
    menu_id: string
    name: string
    qty: number
    price: number
    station?: MenuStation
  }>
}

export type CurrentOrder = {
  id: string
  table_id: string | null
  table_name: string
  status: OrderStatus
  total: number
  created_at: string
  items: Array<{
    id: string
    menu_id: string
    name: string
    qty: number
    price: number
    station?: MenuStation
  }>
} | null

export type KitchenTicket = {
  order_id: string
  table_name: string
  status: string
  created_at: string
  station: MenuStation
  items: Array<{
    id: string
    name: string
    qty: number
    station?: MenuStation
  }>
}