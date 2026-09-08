'use server';

import { createServerClient as createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export interface FamilyMemberData {
  member_name: string;
  relationship: string;
  birthdate?: string;
  occupation?: string;
  civil_status?: string;
  monthly_income?: number;
}

export async function getFamilyMembers(seniorId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('family_composition')
    .select('*')
    .eq('senior_id', seniorId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching family members:', error);
    return [];
  }

  return data || [];
}

export async function addFamilyMember(seniorId: string, member: FamilyMemberData) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('family_composition')
    .insert({
      senior_id: seniorId,
      member_name: member.member_name,
      relationship: member.relationship,
      birthdate: member.birthdate || null,
      occupation: member.occupation || null,
      civil_status: member.civil_status || null,
      monthly_income: member.monthly_income || 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding family member:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/directory');
  return { success: true, data };
}

export async function updateFamilyMember(id: string, updates: Partial<FamilyMemberData>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('family_composition')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating family member:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/directory');
  return { success: true, data };
}

export async function deleteFamilyMember(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('family_composition')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting family member:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/directory');
  return { success: true };
}
