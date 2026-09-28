# Installation automatique pour Windows (PowerShell 5.1+).
# Lancement : double-cliquer sur setup.cmd (ou : powershell -ExecutionPolicy Bypass -File setup.ps1)
#
# Étapes : vérifie Node/npm → crée ou répare .env (secrets générés) → démarre PostgreSQL (Docker)
# → Redis facultatif → npm install → base de données → données de démo → lance l'application.

# "Continue" : les erreurs des programmes externes sont vérifiées via $LASTEXITCODE
$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot

function Etape($texte) { Write-Host ""; Write-Host "==> $texte" -ForegroundColor Magenta }
function Ok($texte) { Write-Host "    OK  $texte" -ForegroundColor Green }
function Info($texte) { Write-Host "    ..  $texte" -ForegroundColor Gray }
function Echec($texte) {
  Write-Host ""
  Write-Host "    ERREUR : $texte" -ForegroundColor Red
  Write-Host ""
  Read-Host "Appuyez sur Entree pour fermer"
  exit 1
}
function Existe($commande) { return [bool](Get-Command $commande -ErrorAction SilentlyContinue) }

function PortOuvert($port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $tentative = $client.BeginConnect("127.0.0.1", $port, $null, $null)
    $ok = $tentative.AsyncWaitHandle.WaitOne(800)
    if ($ok -and $client.Connected) { return $true }
    return $false
  } catch { return $false } finally { $client.Close() }
}

function AttendrePort($port, $secondes) {
  for ($i = 0; $i -lt $secondes; $i++) {
    if (PortOuvert $port) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

# Lecture / écriture du .env en UTF-8 SANS BOM (un BOM casserait la première variable)
$utf8SansBom = New-Object System.Text.UTF8Encoding $false
function LireEnv() { return [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot ".env")) }
function EcrireEnv($contenu) { [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot ".env"), $contenu, $utf8SansBom) }
function ValeurEnv($contenu, $nom) {
  $m = [regex]::Match($contenu, "(?m)^$nom=(.*)$")
  if ($m.Success) { return $m.Groups[1].Value.Trim() }
  return $null
}
function DefinirEnv($contenu, $nom, $valeur) {
  if ([regex]::IsMatch($contenu, "(?m)^$nom=")) {
    return [regex]::Replace($contenu, "(?m)^$nom=.*$", "$nom=$valeur")
  }
  return $contenu.TrimEnd() + "`r`n$nom=$valeur`r`n"
}
function Secret() { return (node -e "console.log(require('crypto').randomBytes(32).toString('base64'))").Trim() }

Write-Host "Compagnon virtuel 18+ - installation" -ForegroundColor Magenta

# 1. Outils ------------------------------------------------------------------
Etape "Verification des outils"
if (-not (Existe "node")) { Echec "Node.js n'est pas installe. Installez la version LTS depuis https://nodejs.org puis relancez." }
$versionNode = (node -v).Trim()
$majeure = [int]($versionNode.TrimStart("v").Split(".")[0])
if ($majeure -lt 18) { Echec "Node.js $versionNode est trop ancien (18 minimum). Installez la version LTS depuis https://nodejs.org" }
Ok "Node.js $versionNode"
if (-not (Existe "npm")) { Echec "npm est introuvable (il est normalement installe avec Node.js)." }
Ok "npm $((npm -v).Trim())"
$docker = Existe "docker"
if ($docker) {
  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    Info "Docker est installe mais pas demarre : ouverture de Docker Desktop..."
    $exe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (Test-Path $exe) { Start-Process $exe }
    for ($i = 0; $i -lt 90; $i++) {
      Start-Sleep -Seconds 2
      docker info *> $null
      if ($LASTEXITCODE -eq 0) { break }
    }
  }
  docker info *> $null
  $docker = ($LASTEXITCODE -eq 0)
}
if ($docker) { Ok "Docker demarre" } else { Info "Docker indisponible (PostgreSQL devra etre deja installe et lance)" }

# 2. Fichier .env --------------------------------------------------------------
Etape "Configuration (.env)"
if (-not (Test-Path ".env")) {
  if (-not (Test-Path ".env.example")) { Echec ".env.example introuvable. Lancez 'git pull' dans le dossier du depot puis relancez." }
  Copy-Item ".env.example" ".env"
  Ok ".env cree a partir de .env.example"
} else {
  Ok ".env existant conserve"
}
$envTexte = LireEnv
# Retire un eventuel BOM laisse par le Bloc-notes
$envTexte = $envTexte.TrimStart([char]0xFEFF)
foreach ($nom in @("NEXTAUTH_SECRET", "ENCRYPTION_KEY")) {
  if (-not (ValeurEnv $envTexte $nom)) {
    $envTexte = DefinirEnv $envTexte $nom (Secret)
    Ok "$nom genere"
  }
}
if (-not (ValeurEnv $envTexte "DATABASE_URL")) {
  $envTexte = DefinirEnv $envTexte "DATABASE_URL" "postgresql://postgres:postgres@localhost:5432/compagnon?schema=public"
}
if (-not (ValeurEnv $envTexte "NEXTAUTH_URL")) { $envTexte = DefinirEnv $envTexte "NEXTAUTH_URL" "http://localhost:3000" }
if (-not (ValeurEnv $envTexte "AGE_VERIFICATION_MODE")) { $envTexte = DefinirEnv $envTexte "AGE_VERIFICATION_MODE" "dev" }
EcrireEnv $envTexte

# 3. PostgreSQL ----------------------------------------------------------------
Etape "Base de donnees PostgreSQL"
if (PortOuvert 5432) {
  Ok "PostgreSQL repond sur le port 5432"
} elseif ($docker) {
  $existant = (docker ps -a --filter "name=^pg$" --format "{{.Names}}")
  if ($existant -eq "pg") {
    Info "Demarrage du conteneur 'pg'..."
    docker start pg | Out-Null
  } else {
    Info "Creation du conteneur PostgreSQL 'pg' (premier lancement, telechargement possible)..."
    docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=compagnon -p 5432:5432 postgres:16 | Out-Null
  }
  if (-not (AttendrePort 5432 60)) { Echec "PostgreSQL ne demarre pas. Ouvrez Docker Desktop et regardez les logs du conteneur 'pg'." }
  Start-Sleep -Seconds 3
  Ok "PostgreSQL demarre"
} else {
  Echec "PostgreSQL n'est pas lance et Docker est indisponible. Installez Docker Desktop (https://www.docker.com/products/docker-desktop) puis relancez ce script."
}

# 4. Redis (facultatif) ----------------------------------------------------------
Etape "Redis (facultatif)"
if (PortOuvert 6379) {
  $envTexte = DefinirEnv (LireEnv) "REDIS_URL" "redis://localhost:6379"
  Ok "Redis repond sur le port 6379"
} elseif ($docker) {
  $existant = (docker ps -a --filter "name=^redis$" --format "{{.Names}}")
  if ($existant -eq "redis") { docker start redis | Out-Null } else { docker run -d --name redis -p 6379:6379 redis:7 | Out-Null }
  if (AttendrePort 6379 30) {
    $envTexte = DefinirEnv (LireEnv) "REDIS_URL" "redis://localhost:6379"
    Ok "Redis demarre"
  } else {
    $envTexte = DefinirEnv (LireEnv) "REDIS_URL" ""
    Info "Redis indisponible : memoire locale utilisee (suffisant pour tester)"
  }
} else {
  $envTexte = DefinirEnv (LireEnv) "REDIS_URL" ""
  Info "Pas de Redis : memoire locale utilisee (suffisant pour tester)"
}
EcrireEnv $envTexte

# 5. Dépendances et base -------------------------------------------------------
Etape "Installation des dependances (npm install, quelques minutes la premiere fois)"
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Echec "npm install a echoue (voir le message ci-dessus)." }
Ok "Dependances installees"

Etape "Creation des tables"
npm run db:push
if ($LASTEXITCODE -ne 0) { Echec "Impossible de creer les tables. Verifiez DATABASE_URL dans .env (utilisateur/mot de passe de PostgreSQL)." }
Ok "Tables pretes"

Etape "Donnees de demo"
npm run db:seed
if ($LASTEXITCODE -ne 0) { Echec "Le chargement des donnees de demo a echoue (voir ci-dessus)." }
Ok "Comptes de demo prets"

# 6. Lancement -------------------------------------------------------------------
$envFinal = LireEnv
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Magenta
Write-Host " Tout est pret !" -ForegroundColor Green
Write-Host "   Adresse   : http://localhost:3000"
Write-Host "   Fan       : fan@demo.local / demo-fan-123"
Write-Host "   Createur  : createur@demo.local / demo-createur-123"
if (-not (ValeurEnv $envFinal "ANTHROPIC_API_KEY")) {
  Write-Host ""
  Write-Host "   Pour que Lina reponde : ajoutez ANTHROPIC_API_KEY dans .env" -ForegroundColor Yellow
  Write-Host "   (notepad .env), puis relancez setup.cmd." -ForegroundColor Yellow
}
Write-Host "   Laissez cette fenetre ouverte. Ctrl + C pour arreter."
Write-Host "=====================================================================" -ForegroundColor Magenta
Write-Host ""

# Variable utile pour les tests automatisés : tout préparer sans lancer le serveur
if ($env:SETUP_SANS_LANCEMENT) { exit 0 }

# Ouvre le navigateur dès que le serveur répond
Start-Job -ScriptBlock {
  for ($i = 0; $i -lt 120; $i++) {
    try {
      $c = New-Object System.Net.Sockets.TcpClient
      $c.Connect("127.0.0.1", 3000); $c.Close()
      Start-Sleep -Seconds 4
      Start-Process "http://localhost:3000"
      return
    } catch { Start-Sleep -Seconds 1 }
  }
} | Out-Null

npm run dev
