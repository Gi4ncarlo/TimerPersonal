import { create } from 'zustand'
import { DopamineAge, DopamineAgeSurvey } from '@/core/types'
import { supabase } from '@/lib/supabase/client'

interface AppStore {
    // Dopamine Age slice
    dopamineAge: DopamineAge | null
    isLoadingDopamineAge: boolean
    fetchDopamineAge: () => Promise<void>
    completeSurvey: (survey: DopamineAgeSurvey) => Promise<void>
}

export const useAppStore = create<AppStore>((set) => ({
    dopamineAge: null,
    isLoadingDopamineAge: false,

    fetchDopamineAge: async () => {
        set({ isLoadingDopamineAge: true })
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return set({ isLoadingDopamineAge: false });

        const res = await fetch('/api/dopamine-age', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        })
        const data = await res.json()
        set({
            dopamineAge: 'dopamineAge' in data ? data.dopamineAge : data,
            isLoadingDopamineAge: false
        })
    },

    completeSurvey: async (survey: DopamineAgeSurvey) => {
        set({ isLoadingDopamineAge: true })
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return set({ isLoadingDopamineAge: false });

        const res = await fetch('/api/dopamine-age/survey', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(survey),
        })
        const data = await res.json()
        set({
            dopamineAge: 'dopamineAge' in data ? data.dopamineAge : data,
            isLoadingDopamineAge: false
        })
    },
}))
