import { Type as t } from "@sinclair/typebox";

export const createTeamSchema = {
  body: t.Object({
    name: t.String({ minLength: 3, maxLength: 50 }),
    description: t.Optional(t.String({ maxLength: 200 })),
  }),
};

export const inviteToTeamSchema = {
  body: t.Object({
    studentId: t.String(),
  }),
};

export const respondToInvitationSchema = {
  body: t.Object({
    invitationId: t.String(),
    action: t.Enum(["accept", "decline"]),
  }),
};

export const removeMemberSchema = {
  body: t.Object({
    memberId: t.String(),
  }),
};
