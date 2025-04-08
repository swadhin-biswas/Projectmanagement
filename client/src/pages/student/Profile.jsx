import { PageTransition } from "@/components/PageTransition";
import StudentProfile from "@/components/student/StudentProfile";
import React from "react";
import { Helmet } from "react-helmet-async";

const ProfilePage = () => {
  return (
    <PageTransition>
      <Helmet>
        <title>My Profile | Student Portal</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>
        <StudentProfile />
      </div>
    </PageTransition>
  );
};

export default ProfilePage;
