import { faBell, faEnvelope, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

import BulkNotificationForm from "../../components/supervisor/BulkNotificationForm";

const SupervisorNotifications = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-purple-800 dark:text-white flex items-center gap-2">
          <FontAwesomeIcon icon={faBell} className="text-purple-600" />
          Student Communications
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Send notifications and messages to your students and teams
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <BulkNotificationForm />
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
              Communication Tips
            </h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  Be clear and specific in your instructions to students
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  Only mark messages as urgent for time-sensitive matters
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  Include due dates when requesting action from students
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Use the praise message type to recognize good work</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faEnvelope} className="text-indigo-500" />
              Email Notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Email notifications will only be sent to students who have enabled
              email notifications in their preferences.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Students always receive in-app notifications regardless of their
              email preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorNotifications;
