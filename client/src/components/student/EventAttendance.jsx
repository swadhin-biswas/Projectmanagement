import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Clock } from 'lucide-react';

const getStatusIcon = (status) => {
  switch (status) {
    case 'accepted':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'declined':
      return <X className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return null;
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'accepted':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Accepted
        </Badge>
      );
    case 'declined':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Declined
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Pending
        </Badge>
      );
    default:
      return null;
  }
};

export const EventAttendance = ({ attendees, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const stats = {
    accepted: attendees.filter(a => a.status === 'accepted').length,
    declined: attendees.filter(a => a.status === 'declined').length,
    pending: attendees.filter(a => a.status === 'pending').length
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Attendance</CardTitle>
        <CardDescription>
          Track team member responses and participation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-green-700">Accepted</span>
            <span className="text-2xl font-bold text-green-800">{stats.accepted}</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg">
            <span className="text-sm font-medium text-yellow-700">Pending</span>
            <span className="text-2xl font-bold text-yellow-800">{stats.pending}</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-red-50 rounded-lg">
            <span className="text-sm font-medium text-red-700">Declined</span>
            <span className="text-2xl font-bold text-red-800">{stats.declined}</span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Response Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendees.map((attendee) => (
              <TableRow key={attendee.user._id}>
                <TableCell className="flex items-center space-x-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{attendee.user.fullName}</span>
                    <span className="text-sm text-muted-foreground">
                      {attendee.user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(attendee.status)}
                    {getStatusBadge(attendee.status)}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {attendee.respondedAt
                    ? new Date(attendee.respondedAt).toLocaleString()
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
            {attendees.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                  No attendees yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};