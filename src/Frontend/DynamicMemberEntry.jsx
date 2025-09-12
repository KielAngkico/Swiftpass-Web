import React from "react";
import { useLocation } from "react-router-dom";
import MemberEntry from "./Staff/member-entry"; 

const DynamicMemberEntry = () => {
  const location = useLocation();
  const { rfidData, member } = location.state || {};

  return <MemberEntry rfidData={rfidData} member={member} />;
};

export default DynamicMemberEntry;

