const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

async function getPlayerById(playerId) {
    try {
        const { data, error } = await supabaseClient
            .from('players')
            .select('*')
            .eq('id', playerId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка получения игрока:', error);
        return null;
    }
}

async function getAllPlayers() {
    try {
        const { data, error } = await supabaseClient
            .from('players')
            .select('*');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка получения игроков:', error);
        return [];
    }
}