const express=require('express');
const app=express();


const PORT=3000;
const HOST='0.0.0.0';

const path = require("path");
const ROOT = path.join(__dirname,'..','public');
app.use(express.static(ROOT)); 


//Connesione a supabase
const { createClient } = require('@supabase/supabase-js');
const supabaseApi= 'https://ocoztbtixgjdfadqoxtn.supabase.co';
const supabaseApiKey= 'sb_publishable_YyR37XC53HHN1lm8tmbfMA_zreVDEUU';
const supabase = createClient(supabaseApi, supabaseApiKey);

