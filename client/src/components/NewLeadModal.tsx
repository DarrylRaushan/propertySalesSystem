import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  segment: z.enum(["Ready Buyer", "Investor", "Researcher", "Low Engagement"]),
  priority: z.enum(["High", "Medium", "Low"]),
  probability: z.number().min(0).max(100),
  value: z.string().min(1, "Expected value is required"),
  property: z.string().min(1, "Property interest is required"),
  action: z.string().min(1, "Next action is required"),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export default function NewLeadModal() {
  const [open, setOpen] = useState(false);
  
  const utils = trpc.useUtils();
  
  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead created successfully");
      utils.leads.list.invalidate();
      utils.dashboard.metrics.invalidate();
      utils.pipeline.list.invalidate();
      utils.salesTrend.list.invalidate();
      setOpen(false);
      reset();
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    }
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      segment: "Ready Buyer",
      priority: "Medium",
      probability: 50,
      value: "",
    }
  });

  const onSubmit = (data: LeadFormValues) => {
    // Generate initials and accent
    const parts = data.name.split(" ");
    const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : data.name.substring(0, 2);
    
    // Some random accents to make it colorful
    const accents = [
      "bg-[#dbe9f8] text-[#24486b]",
      "bg-[#e8e2f5] text-[#60468e]",
      "bg-[#dff0e6] text-[#2e6a4b]",
      "bg-[#faecd4] text-[#8b5a20]",
      "bg-[#e6edf4] text-[#456176]",
    ];
    const accent = accents[Math.floor(Math.random() * accents.length)];

    createLead.mutate({
      ...data,
      initials: initials.toUpperCase(),
      accent,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-2 bg-[#c9a25f] text-[12px] font-semibold text-[#17283b] hover:bg-[#d6af6a]">
          <Plus className="size-3.5" />
          Add new lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add new lead</DialogTitle>
          <DialogDescription>
            Enter the details for the new prospective buyer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. John Doe" />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} placeholder="e.g. KL City" />
              {errors.location && <p className="text-red-500 text-xs">{errors.location.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Input id="property" {...register("property")} placeholder="e.g. The Mews KL" />
              {errors.property && <p className="text-red-500 text-xs">{errors.property.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Expected Value</Label>
              <Input id="value" type="number" {...register("value")} placeholder="e.g. 1500000" />
              {errors.value && <p className="text-red-500 text-xs">{errors.value.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Segment</Label>
              <Select value={watch("segment")} onValueChange={(val: any) => setValue("segment", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ready Buyer">Ready Buyer</SelectItem>
                  <SelectItem value="Investor">Investor</SelectItem>
                  <SelectItem value="Researcher">Researcher</SelectItem>
                  <SelectItem value="Low Engagement">Low Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={watch("priority")} onValueChange={(val: any) => setValue("priority", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input id="probability" type="number" min="0" max="100" {...register("probability", { valueAsNumber: true })} />
              {errors.probability && <p className="text-red-500 text-xs">{errors.probability.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Next Action</Label>
              <Input id="action" {...register("action")} placeholder="e.g. Schedule viewing" />
              {errors.action && <p className="text-red-500 text-xs">{errors.action.message}</p>}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending} className="bg-[#284762] text-white hover:bg-[#1f3c55]">
              {createLead.isPending ? "Saving..." : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
