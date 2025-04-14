import PageTransition from "@/components/PageTransition";
import MessagesPanel from "@/components/student/MessagesPanel";
import React from "react";
import { Helmet } from "react-helmet-async";

const MessagesPage = () => {
  return (
    <PageTransition>
      <Helmet>
        <title>Messages | Student Portal</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Messages</h1>
        <MessagesPanel />
      </div>
    </PageTransition>
  );
};

export default MessagesPage;
