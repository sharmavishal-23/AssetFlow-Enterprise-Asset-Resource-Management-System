import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_DIR = path.join(process.cwd(), 'src', 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// PBKDF2 Password Hashing
export function hashPassword(password) {
  const salt = 'assetflow_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Initial Seed Data
const seedData = {
  users: [
    {
      id: 1,
      name: 'System Admin',
      email: 'admin@assetflow.com',
      password: hashPassword('admin123'),
      role: 'Admin',
      departmentId: 1,
      status: 'Active',
      createdAt: new Date('2026-01-01').toISOString()
    },
    {
      id: 2,
      name: 'Sarah Connor',
      email: 'manager@assetflow.com',
      password: hashPassword('manager123'),
      role: 'Asset Manager',
      departmentId: 1,
      status: 'Active',
      createdAt: new Date('2026-01-02').toISOString()
    },
    {
      id: 3,
      name: 'John Doe',
      email: 'head@assetflow.com',
      password: hashPassword('head123'),
      role: 'Department Head',
      departmentId: 1,
      status: 'Active',
      createdAt: new Date('2026-01-03').toISOString()
    },
    {
      id: 4,
      name: 'Alice Smith',
      email: 'employee@assetflow.com',
      password: hashPassword('employee123'),
      role: 'Employee',
      departmentId: 2,
      status: 'Active',
      createdAt: new Date('2026-01-04').toISOString()
    }
  ],
  departments: [
    { id: 1, name: 'IT Infrastructure', parentId: null, managerId: 3, createdAt: new Date('2026-01-01').toISOString() },
    { id: 2, name: 'Human Resources', parentId: null, managerId: null, createdAt: new Date('2026-01-01').toISOString() },
    { id: 3, name: 'Operations & Facilities', parentId: null, managerId: null, createdAt: new Date('2026-01-01').toISOString() },
    { id: 4, name: 'IT Helpdesk', parentId: 1, managerId: null, createdAt: new Date('2026-01-02').toISOString() }
  ],
  categories: [
    {
      id: 1,
      name: 'Laptops & Workstations',
      code: 'IT-LAP',
      description: 'Enterprise notebooks and developer workstations',
      customFields: [
        { name: 'Serial Number', type: 'text', required: true },
        { name: 'RAM (GB)', type: 'number', required: true },
        { name: 'Processor', type: 'text', required: false },
        { name: 'OS Version', type: 'text', required: false }
      ],
      createdAt: new Date('2026-01-01').toISOString()
    },
    {
      id: 2,
      name: 'Office Furniture',
      code: 'FUR-OFF',
      description: 'Ergonomic chairs, sit-stand desks, and cabinets',
      customFields: [
        { name: 'Material', type: 'text', required: false },
        { name: 'Warranty Expiry', type: 'date', required: false }
      ],
      createdAt: new Date('2026-01-01').toISOString()
    },
    {
      id: 3,
      name: 'Software Licenses',
      code: 'SW-LIC',
      description: 'SaaS and desktop software licenses',
      customFields: [
        { name: 'License Key', type: 'text', required: true },
        { name: 'Seat Count', type: 'number', required: true },
        { name: 'Expiration Date', type: 'date', required: true }
      ],
      createdAt: new Date('2026-01-01').toISOString()
    }
  ],
  assets: [
    {
      id: 1,
      tag: 'AST-0001',
      name: 'MacBook Pro 16" M3 Max',
      categoryId: 1,
      departmentId: 1,
      allocatedToUserId: 4,
      status: 'Allocated',
      condition: 'Excellent',
      customFieldValues: {
        'Serial Number': 'C02F234XMD6M',
        'RAM (GB)': '64',
        'Processor': 'M3 Max',
        'OS Version': 'macOS Sonoma'
      },
      fileUploads: [],
      createdAt: new Date('2026-01-05').toISOString()
    },
    {
      id: 2,
      tag: 'AST-0002',
      name: 'Dell XPS 15 9530',
      categoryId: 1,
      departmentId: 1,
      allocatedToUserId: null,
      status: 'Available',
      condition: 'Good',
      customFieldValues: {
        'Serial Number': '4X98G83',
        'RAM (GB)': '32',
        'Processor': 'Intel Core i9',
        'OS Version': 'Windows 11 Pro'
      },
      fileUploads: [],
      createdAt: new Date('2026-01-06').toISOString()
    },
    {
      id: 3,
      tag: 'AST-0003',
      name: 'Steelcase Gesture Chair',
      categoryId: 2,
      departmentId: 2,
      allocatedToUserId: null,
      status: 'Available',
      condition: 'Excellent',
      customFieldValues: {
        'Material': 'Fabric',
        'Warranty Expiry': '2031-12-31'
      },
      fileUploads: [],
      createdAt: new Date('2026-01-07').toISOString()
    },
    {
      id: 4,
      tag: 'AST-0004',
      name: 'Conference Room Display 65"',
      categoryId: 1,
      departmentId: 3,
      allocatedToUserId: null,
      status: 'Under Maintenance',
      condition: 'Fair',
      customFieldValues: {
        'Serial Number': 'LG-65UK6300',
        'RAM (GB)': '2',
        'Processor': 'Quad-Core',
        'OS Version': 'webOS 4.0'
      },
      fileUploads: [],
      createdAt: new Date('2026-01-08').toISOString()
    }
  ],
  transfers: [
    {
      id: 1,
      assetId: 2,
      fromUserId: null,
      toUserId: 4,
      requestedByUserId: 4,
      departmentId: 1,
      status: 'Pending',
      notes: 'Need a secondary test machine for Windows compatibility testing.',
      createdAt: new Date('2026-07-10T10:00:00Z').toISOString()
    }
  ],
  bookings: [
    {
      id: 1,
      assetId: 4,
      userId: 3,
      title: 'Monthly Operations Review Meeting',
      startTime: new Date('2026-07-15T09:00:00Z').toISOString(),
      endTime: new Date('2026-07-15T11:00:00Z').toISOString(),
      status: 'Confirmed',
      createdAt: new Date('2026-07-11T12:00:00Z').toISOString()
    }
  ],
  maintenance: [
    {
      id: 1,
      assetId: 4,
      technicianName: 'Bob Repairman',
      description: 'Backlight flicker issue repair',
      cost: 150.00,
      status: 'In Progress',
      startDate: new Date('2026-07-11').toISOString().split('T')[0],
      endDate: new Date('2026-07-14').toISOString().split('T')[0],
      createdAt: new Date('2026-07-11T08:30:00Z').toISOString()
    }
  ],
  audits: [
    {
      id: 1,
      name: 'Q3 IT Equipment Inventory Audit',
      startDate: new Date('2026-07-01').toISOString().split('T')[0],
      endDate: new Date('2026-07-20').toISOString().split('T')[0],
      auditorUserId: 2,
      status: 'In Progress',
      discrepancyReport: {
        checkedAssets: [1],
        missingAssets: [],
        damagedAssets: []
      },
      createdAt: new Date('2026-07-01T09:00:00Z').toISOString()
    }
  ],
  notifications: [
    {
      id: 1,
      userId: 1,
      title: 'New Transfer Request',
      message: 'Alice Smith requested allocation of Dell XPS 15.',
      read: false,
      createdAt: new Date('2026-07-10T10:01:00Z').toISOString()
    }
  ],
  activityLogs: [
    {
      id: 1,
      userId: 1,
      action: 'USER_REGISTER',
      details: 'System seeded with default configuration.',
      timestamp: new Date('2026-07-12T00:00:00Z').toISOString()
    }
  ]
};

// Database class with thread-safe file writing using sync primitives
class JSONDatabase {
  constructor() {
    this.cache = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      this.cache = seedData;
      this.save();
    } else {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        this.cache = JSON.parse(fileContent);
      } catch (err) {
        console.error('Error reading database file, resetting to seed data:', err);
        this.cache = seedData;
        this.save();
      }
    }
  }

  save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.cache, null, 2), 'utf8');
  }

  getTable(table) {
    if (!this.cache[table]) {
      this.cache[table] = [];
      this.save();
    }
    return this.cache[table];
  }

  get(table) {
    return this.getTable(table);
  }

  getById(table, id) {
    const list = this.getTable(table);
    return list.find(item => item.id === parseInt(id));
  }

  insert(table, row) {
    const list = this.getTable(table);
    const nextId = list.length > 0 ? Math.max(...list.map(item => item.id)) + 1 : 1;
    const newRow = { id: nextId, ...row, createdAt: new Date().toISOString() };
    list.push(newRow);
    this.save();
    return newRow;
  }

  update(table, id, updates) {
    const list = this.getTable(table);
    const idx = list.findIndex(item => item.id === parseInt(id));
    if (idx === -1) return null;
    const updatedRow = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    list[idx] = updatedRow;
    this.save();
    return updatedRow;
  }

  delete(table, id) {
    const list = this.getTable(table);
    const idx = list.findIndex(item => item.id === parseInt(id));
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.save();
    return true;
  }

  query(table, filterFn) {
    return this.getTable(table).filter(filterFn);
  }

  logActivity(userId, action, details) {
    this.insert('activityLogs', {
      userId: userId ? parseInt(userId) : null,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  createNotification(userId, title, message) {
    this.insert('notifications', {
      userId: parseInt(userId),
      title,
      message,
      read: false
    });
  }
}

const db = new JSONDatabase();
export default db;
