import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(req) {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    const assets = db.get('assets');
    const categories = db.get('categories');
    const departments = db.get('departments');
    const users = db.get('users');
    const bookings = db.get('bookings');

    // 1. Check if format is CSV for direct export download
    if (format === 'csv') {
      let csvContent = 'Asset Tag,Asset Name,Category,Department,Assigned User,Status,Condition,Created Date\n';
      
      assets.forEach(asset => {
        const cat = categories.find(c => c.id === asset.categoryId)?.name || 'N/A';
        const dept = departments.find(d => d.id === asset.departmentId)?.name || 'N/A';
        const user = users.find(u => u.id === asset.allocatedToUserId)?.name || 'Unassigned';
        const row = [
          `"${asset.tag}"`,
          `"${asset.name.replace(/"/g, '""')}"`,
          `"${cat}"`,
          `"${dept}"`,
          `"${user}"`,
          `"${asset.status}"`,
          `"${asset.condition}"`,
          `"${asset.createdAt.split('T')[0]}"`
        ].join(',');
        csvContent += row + '\n';
      });

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=assetflow_report.csv'
        }
      });
    }

    // 2. Generate JSON analytics structure
    // Status breakdown counts
    const statusCounts = {
      Available: 0,
      Allocated: 0,
      Reserved: 0,
      'Under Maintenance': 0,
      Lost: 0,
      Retired: 0,
      Disposed: 0
    };
    assets.forEach(a => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    });

    // Department breakdown counts
    const departmentCounts = {};
    departments.forEach(d => {
      departmentCounts[d.name] = { total: 0, allocated: 0 };
    });
    assets.forEach(a => {
      const dept = departments.find(d => d.id === a.departmentId);
      if (dept) {
        if (!departmentCounts[dept.name]) {
          departmentCounts[dept.name] = { total: 0, allocated: 0 };
        }
        departmentCounts[dept.name].total++;
        if (a.status === 'Allocated') {
          departmentCounts[dept.name].allocated++;
        }
      }
    });

    // Booking Heatmap frequencies (hour of day: 0 - 23)
    const bookingHeatmap = Array(24).fill(0);
    bookings.forEach(b => {
      if (b.status === 'Confirmed') {
        const startHour = new Date(b.startTime).getHours();
        bookingHeatmap[startHour]++;
      }
    });

    // Total utilization metrics
    const totalAssets = assets.length;
    const allocatedAssets = assets.filter(a => a.status === 'Allocated').length;
    const utilizationRate = totalAssets > 0 ? Math.round((allocatedAssets / totalAssets) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalAssets,
          allocatedAssets,
          utilizationRate,
          underMaintenance: assets.filter(a => a.status === 'Under Maintenance').length,
          lost: assets.filter(a => a.status === 'Lost').length
        },
        statusCounts,
        departmentCounts,
        bookingHeatmap
      }
    });

  } catch (err) {
    console.error('Fetch reports error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
