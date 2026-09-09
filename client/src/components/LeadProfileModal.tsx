import React from "react";
import { toast } from "sonner";
import LeadDetailModal, {
  toLeadDetail,
  type LeadDetail,
  type LeadSignal,
} from "./LeadDetailModal";

export type LeadProfileData = {
  id: number | string;
  initials?: string;
  name: string;
  location: string;
  probability?: number;
  fit?: number;
  value?: number | string;
  propertyValue?: number;
  expectedValue?: number;
  leadScore?: number;
  segment?: string;
  priority?: string;
  action?: string;
  nextAction?: string;
  property?: string;
  propertyName?: string;
  accent?: string;
  phone?: string;
  email?: string;
  lastContacted?: string;
  notes?: string;
  primaryInsight?: string;
  signals?: LeadSignal[];
};

export default function LeadProfileModal({
  lead,
  open,
  onOpenChange,
  onOpen3DViewer,
}: {
  lead: LeadProfileData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen3DViewer?: (lead: LeadProfileData) => void;
}) {
  if (!lead) return null;
  const leadDetail = toLeadDetail(lead);

  return (
    <LeadDetailModal
      open={open}
      lead={leadDetail}
      onClose={() => onOpenChange(false)}
      onViewUnit={() => {
        onOpenChange(false);
        if (onOpen3DViewer) {
          onOpen3DViewer(lead);
        }
      }}
      onConfirmFollowUp={(ld: LeadDetail) => {
        toast.success(`Action recorded for ${ld.name}`, {
          description: `Logged in activity timeline: "${ld.nextAction}"`,
        });
      }}
    />
  );
}

export { LeadDetailModal, toLeadDetail };
