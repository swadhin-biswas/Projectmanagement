
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "../../contexts/AuthContext";

const StudentProfile = () => {
  const { user } = useAuth();

  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return "ST";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={`https://ui-avatars.com/api/?name=${user?.fullName}&background=0D8ABC&color=fff`}
                alt={user?.fullName}
              />
              <AvatarFallback>{getInitials(user?.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user?.fullName}</h2>
              <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Student ID: {user?.studentDetails?.studentId || "Not assigned"}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Academic Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Department:</span>
                  <span className="ml-2">{user?.department}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Session:</span>
                  <span className="ml-2">
                    {user?.studentDetails?.session?.name || "Not enrolled"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Team Role:</span>
                  <span className="ml-2">
                    {user?.studentDetails?.isTeamLeader ? "Team Leader" : "Team Member"}
                  </span>
                </div>
              </div>
            </div>

            {user?.studentDetails?.team && (
              <div>
                <h3 className="font-semibold mb-2">Team Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Team:</span>
                    <span className="ml-2">{user.studentDetails.team.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Members:</span>
                    <span className="ml-2">{user.studentDetails.team.members?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Project Status:</span>
                    <span className="ml-2">
                      {user.studentDetails.team.project?.status || "No project"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProfile;