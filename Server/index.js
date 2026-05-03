
//Inizailizzazione del server
const express=require('express');
const path = require("path");
const app=express();

//Impostiamo la porta
const PORT=3000;
const HOST='0.0.0.0';

//Impostiamo le rotte
const ROOT = path.join(__dirname,'..','client');
app.use(express.static(ROOT)); 
app.use(express.json());

//importo le pagine
//pagina home
app.get('/',(req,res)=>{
    res.sendFile(path.join(ROOT,'index.html'));
});

//pagina login
app.get('/login',(req,res)=>{
    res.sendFile(path.join(ROOT,'login.html'));
});

//pagina Luoghi
app.get('/luogo',(req,res)=>{
    res.sendFile(path.join(ROOT,'luogo.html'));
});



//Connesione a supabase
const { createClient } = require('@supabase/supabase-js');
const supabaseApi= 'https://ocoztbtixgjdfadqoxtn.supabase.co';
const supabaseApiKey= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jb3p0YnRpeGdqZGZhZHFveHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODIwMzIsImV4cCI6MjA5MTM1ODAzMn0.K0tLeh1T-2zjCl3WSvtueTKRQWEadmR1gBXgguALov0';
const supabase = createClient(supabaseApi, supabaseApiKey);

//Funzione per aggiungere l'url dell'immagine a un luogo
const aggiungiUrl = (luogo) => {
    const { data: urlData } = supabase.storage
        .from('foto')
        .getPublicUrl(luogo.immagine);
    return { 
        ...luogo, 
        immagine: urlData.publicUrl 
    };
};


//API


//Ottengo tutti i luoghi dal database
app.get('/api/luoghi', async (req, res) => {
    const { data, error } = await supabase
        .from('Luoghi')
        .select('*');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    //per debug
    console.log("DATA:", data);
    console.log("ERROR:", error);

    //aggiungo l'url dell'immagine
    res.json(data.map(aggiungiUrl));
});
//Ottengo un luogo specifico dal database
app.get('/api/luoghi/:id', async (req, res) => {
    const id = req.params.id;
    const { data, error } = await supabase
        .from('Luoghi')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // restituisce oggetto singolo, non array     

    console.log("ID:", id, "| DATA:", data, "| ERROR:", error);

    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(404).json({ error: 'Luogo non trovato' });

    res.json(aggiungiUrl(data));
});
app.get("/api/luoghi/vicini", (req, res) => {
    const { lat, lng } = req.query;

    const risultati = luoghi.map(l => {
        const dist = Math.sqrt(
            Math.pow(l.lat - lat, 2) +
            Math.pow(l.lng - lng, 2)
        );

        return { ...l, dist };
    }).sort((a, b) => a.dist - b.dist);

    res.json(risultati);
});


//SESSIONI

const session = require('express-session');

app.use(session({
  secret: 'una_stringa_segreta_molto_lunga',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true
  }
}));

//AUTENTICAZIONE
app.use(express.json()); //consente agli handler di leggere il body (renza questa riga la funzione req.body da errore)

/*
Use serve per creare un middleware, un ulteriore operazione che la richiesta subisce prima di raggiungere destinazione. 
IMPORTANTE: use applica un middleware a tutte le richieste in entrata.
IMPORTANTE: l'ordine in cui i middleware sono scritti nel mio file, sarebbe lo stesso con cui vengono applicati (app.use(espress.static(ROOT)) viene applicato prima di app.use(express.json()) )
IMPORTANTE: è necessario che certi middleware vengano scritti prima di alcine handler (esempio app.use(express.json()) deve essere scritto prima di req.body negli handler)
*/

const bcrypt = require('bcrypt') //usiamo bcrypt per fare un hashing della password

app.get('/api/me', (req, res) => {

    //req.session.user ritorna la sessione per l'utente se è presente
    if (req.session.user) {
        
        //se c'è una sessione attiva allora ritorno all'utente i suoi dati
        res.json(req.session.user);
    } else {
        //se non c'è una sessione, mando il codice 401 (non autorizzato)
        res.status(401).json({ error: "Non sei loggato" });
    }
});

app.post("/api/login", async (req,res) =>{
    const {name, surname, email, password} = req.body; //anche qui passo i dati utente tramite il body

    //console.log("ricevuti: " + email + ", " + password)

    if (!email || !password) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    //effettuo una select sul database per cercare l'utente
    const { data: user, error } = await supabase
        .from('consumer')
        .select('*')
        .eq('email', email) //lo cerchiamo rispetto alla mail
        .single();

    if (!user || error) {
        //401 -> utente non autorizzato
        return res.status(401).json({ error: "Utente non trovato" });
    }

    //a stringhe uguali corrispondono hash uguali

    console.log("PASSWORD RICEVUTA:", JSON.stringify(password));
    console.log("HASH DAL DB:", user.password_hash);
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    console.log("PASSWORD CORRETTA?", isPasswordCorrect);


    if(isPasswordCorrect){
        
        //faccio partire una sessione e anche qui salvo i dati utente di base
        req.session.user = { 
            email: user.email,
            name: user.name,   
            surname: user.surname
        };

        res.json({ message: "Login effettuato!", user: req.session.user});
    } else {
        res.status(401).json({ error: "Password errata" });
    }

})




app.post("/api/register", async (req, res) =>{
    const {name, surname, email, password} = req.body;  //richiediamo il body dalla richiesta (il body contiene i dati utente)

    //console.log("ricevuti: " + username +", "+ email +", " + password)

    if (!email || !password) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    //rifaccio il controllo sulla password (questo è un controllo forte, il server non è alterabile)
    if (password.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    try {
        
        //uso il sale nella funzione di hashing
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        
        const { data, error } = await supabase
            .from('consumer')
            .insert([
                { 
                    name: name,
                    surname: surname,
                    email: email, 
                    password_hash: hash, //noi inseriamo nel database l'hashing della password
                }
            ])
            .select();

        
        //quando il vincolo di chiave sulla mail è stato violato, allora postrgre restituisce il codice di errore 23505 IMPORTANTE: se non usate postgresql c'è un altro codice di errore
        if (error) {
            if (error.code === '23505') { //se la mail è in uso, notifico l'utente con un codice 400
                return res.status(400).json({ error: "Questa email è già registrata" });
            }
            throw error;
        }

        //faccio partire una nuova sessione e riempio il campo "sess" con i dati utente di base
        req.session.user = { 
            id: data[0].id,
            email: data[0].email 
        };

       
        res.status(201).json({ 
            message: "Utente creato con successo!",
            user: req.session.user //mandiamo i dati all'utente (non serve in realtà)
        });

    } catch (err) {
        console.error("Errore registrazione:", err.message, err.stack);
        res.status(500).json({ error: "Errore interno del server" });
    }

})
// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout effettuato' });
});

// Recensioni utente
app.get('/api/recensioni', async (req, res) => {
    const { userId } = req.query;
    const { data, error } = await supabase
        .from('recensioni')
        .select('*, Luoghi(nome, tipologia)')
        .eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

const nodemailer = require('nodemailer');
const crypto = require('crypto');


app.post('/api/recover-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ error: "Email obbligatoria" });
        // Controllo associazion email - account
        const { data: user, error } = await supabase
            .from('consumer')
            .select('*')
            .eq('email', email)
            .single();

        if (!user || error) {
            return res.status(404).json({ error: "Nessun account associato a questa email" });
        }
        // Generazione token univoco + scadenza e salvataggio nel db
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 300000).toISOString();//+5 minuti

        const { data: insertData, error: insertError } = await supabase
            .from('password_resets')
            .insert([{ email, token, expiry }])
            .select();

        console.log("INSERT DATA:", JSON.stringify(insertData));
        console.log("INSERT ERROR:", JSON.stringify(insertError));

        if (insertError) {
            return res.status(500).json({ error: "Errore salvataggio token: " + insertError.message });
        }
        //invio mail
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'noreply.aperetto@gmail.com',
                pass: 'tcez yues japg skee'// usa una App Password di Google, non la password normale
            }
        });

        const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;

        await transporter.sendMail({
            from: 'noreply.aperetto@gmail.com',
            to: email,
            subject: 'Recupero password - Aperetto',
            html: `<p>Clicca il link per reimpostare la tua password:</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>Il link scade tra 5 minuti.</p>`
        });

        res.json({ message: "Email inviata!" });

    } catch (err) {
        console.error("ERRORE RECOVER-PASSWORD:", err.message, err.stack);
        res.status(500).json({ error: "Errore interno: " + err.message });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: "Dati mancanti" });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    // 1. Recupero il token dal db
    const { data: reset, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('token', token)
        .maybeSingle();

    if (!reset || error) {
        return res.status(400).json({ error: "Token non valido" });
    }

    // 2. Controllo scadenza
    if (new Date() > new Date(reset.expiry)) {
        return res.status(400).json({ error: "Il link è scaduto" });
    }

    // 3. Hash della nuova password e aggiornamento utente
    const hash = await bcrypt.hash(newPassword, 10);
    console.log("NUOVA PASSWORD:", JSON.stringify(newPassword)); // controlla se ha spazi
    console.log("HASH GENERATO:", hash);
    const { data: updateData, error: updateError } = await supabase
    .from('consumer')
    .update({ password_hash: hash })
    .eq('email', reset.email)
    .select(); // <-- aggiunge questo

    console.log("UPDATE DATA:", JSON.stringify(updateData)); // quante righe ha aggiornato?
    console.log("UPDATE ERROR:", updateError);
    console.log("EMAIL USATA PER UPDATE:", reset.email);


    if (updateError) {
        return res.status(500).json({ error: "Errore nell'aggiornamento della password" });
    }

    // 4. Elimino il token usato (così non può essere riusato)
    await supabase.from('password_resets').delete().eq('token', token);

    res.json({ message: "Password aggiornata con successo!" });
});

// ── 1. GET tutte le recensioni di un luogo (pubblica, senza login) ──
app.get('/api/recensioni/luogo/:id', async (req, res) => {
    const { id } = req.params;
 
    const { data, error } = await supabase
        .from('recensioni')
        .select(`
            id,
            voto,
            testo,
            created_at,
            consumer!recensioni_user_id_fkey ( name, surname )
        `)
        .eq('luogo_id', id)
        .order('created_at', { ascending: false });

        console.log("RECENSIONI DATA:", JSON.stringify(data));
        console.log("RECENSIONI ERROR:", JSON.stringify(error));
 
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
 
 
// ── 2. POST crea una recensione (solo utenti loggati) ──
app.post('/api/recensioni', async (req, res) => {
 
    // blocca se non loggato
    if (!req.session.user) {
        return res.status(401).json({ error: 'Devi essere loggato per recensire' });
    }
 
    const { luogo_id, voto, testo } = req.body;
    const user_id = req.session.user.email;
    // validazione base
    if (!luogo_id || !voto) {
        return res.status(400).json({ error: 'luogo_id e voto sono obbligatori' });
    }
    if (voto < 1 || voto > 5) {
        return res.status(400).json({ error: 'Il voto deve essere tra 1 e 5' });
    }
 
    const { data, error } = await supabase
        .from('recensioni')
        .insert([{ luogo_id, user_id, voto, testo: testo || '' }])
        .select('id, voto, testo, created_at, user_id')
        .single();
 
    if (error) {
        // codice 23505 = unique violato → utente ha già recensito questo locale
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Hai già recensito questo locale' });
        }
        return res.status(500).json({ error: error.message });
    }
 
    res.status(201).json(data);
});
 
 
// ── 3. GET recensioni dell'utente loggato (per la pagina profilo) ──
//    Sostituisce la tua rotta GET /api/recensioni esistente
//    (quella vecchia usava ?userId=... dalla query, questa usa la sessione)
app.get('/api/recensioni/mie', async (req, res) => {
 
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non autorizzato' });
    }
 
    const user_id = req.session.user.email;
 
    const { data, error } = await supabase
        .from('recensioni')
        .select(`
            id,
            voto,
            testo,
            created_at,
            Luoghi:luogo_id ( nome, tipologia )
        `)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
 
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
 
// Serve la pagina di reset
app.get('/client/reset-password.html', (req, res) => {
    res.sendFile(path.join(ROOT, 'reset-password.html'));
});

//AVVIO SERVER
app.listen(PORT,HOST,()=>{
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});