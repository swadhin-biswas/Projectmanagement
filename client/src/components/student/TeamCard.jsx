import React from 'react';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

const TeamCard = ({ team }) => {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{team.name}</h3>
          <p className="text-sm text-gray-500">Team ID: {team._id}</p>
        </div>
        <Badge variant={team.status === 'active' ? 'success' : 'warning'}>
          {team.status}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Members:</span>
          <AvatarGroup max={4}>
            {team.members.map((member) => (
              <Avatar
                key={member._id}
                src={member.profilePicture}
                alt={member.name}
                className="w-8 h-8"
              />
            ))}
          </AvatarGroup>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Project Status:</span>
          <Badge variant="info">{team.projectStatus}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Supervisor:</span>
          <span className="font-medium">{team.supervisor?.name}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-end space-x-2">
          <button className="btn-secondary btn-sm">Chat</button>
          <button className="btn-primary btn-sm">View Details</button>
        </div>
      </div>
    </Card>
  );
};

export default TeamCard;
