// NourishlandXR interface language service.
// English remains the source of truth and the default. A runtime translation
// pass swaps the rendered DOM into Portuguese (Portugal) when selected.
const SETTINGS_KEY = 'nourishland-xr-settings';
export const SUPPORTED_LANGUAGES = Object.freeze({
    en: 'English',
    'pt-PT': 'Português (Portugal)'
});

export function currentNxrLanguage() {
    try {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        return SUPPORTED_LANGUAGES[settings.language] ? settings.language : 'en';
    } catch {
        return 'en';
    }
}

export function applyNxrLanguage() {
    const language = currentNxrLanguage();
    document.documentElement.lang = language === 'pt-PT' ? 'pt-PT' : 'en';
    document.body.dataset.language = language;
    return language;
}

export function setNxrLanguage(language) {
    const value = SUPPORTED_LANGUAGES[language] ? language : 'en';
    try {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        settings.language = value;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        // Storage unavailable — keep the in-memory language below.
    }
    applyNxrLanguage();
    translateApp(document.getElementById('app'));
    return value;
}

const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();

const PHRASES = {
    // ─── Welcome ────────────────────────────────────────────────────────
    'Plant literacy · spatial learning': 'Literacia vegetal · aprendizagem espacial',
    'MAP. GROW. LEARN IN PLACE.': 'MAPEAR. CULTIVAR. APRENDER NO LUGAR.',
    'What would you like to do?': 'O que gostaria de fazer?',
    'Create & Manage': 'Criar & Gerir',
    'Build and manage locations, content and visitor experiences.': 'Construa e gerencie locais, conteúdos e experiências para visitantes.',
    'Explore a Place': 'Explorar um Lugar',
    'Discover plants and stories using Explorer or the Field Guide.': 'Descubra plantas e histórias com o Explorador ou o Guia de Campo.',
    'About This Tool': 'Sobre Esta Ferramenta',
    'Understand what NourishlandXR is and what it can help you build.': 'Compreenda o que é o NourishlandXR e o que ele o pode ajudar a criar.',
    'TRY IT NOW': 'EXPERIMENTE AGORA',
    'A quick introduction to spatial stories, Markers and Areas.': 'Uma introdução rápida a histórias espaciais, Marcadores e Áreas.',
    'Settings': 'Definições',
    'Account': 'Conta',
    'Platform navigation': 'Navegação da plataforma',
    'Language': 'Idioma',
    'NourishlandXR turns real gardens and landscapes into interactive learning experiences, helping people discover the plants, stories and natural relationships found around them.': 'O NourishlandXR transforma jardins e paisagens reais em experiências de aprendizagem interativas, ajudando as pessoas a descobrirem as plantas, histórias e relações naturais que as rodeiam.',
    'Using a suitable device—such as your phone—you can map and explore plant-rich places, including home gardens, food forests, community gardens, farms and native forests. Add plants, mark important locations, create relationships, record observations and create information that others can discover while visiting the landscape.': 'Com um dispositivo adequado — como o seu telemóvel — pode mapear e explorar lugares ricos em plantas, incluindo jardins domésticos, florestas alimentares, hortas comunitárias, quintas e florestas nativas. Adicione plantas, marque locais importantes, crie relações, registe observações e crie informação que outros possam descobrir ao visitar a paisagem.',
    'Nourishland is committed to providing educational tools and hands-on solutions that help green our planet, growing more sustainable and engaging food systems for the world around us. Through food forests, plant literacy, and immersive learning experiences, we bring people closer to how food is grown, cared for, and shared — making sustainability something practical, adaptable, and genuinely enjoyable to be part of.': 'A Nourishland está empenhada em fornecer ferramentas educativas e soluções práticas que ajudem a tornar o nosso planeta mais verde, criando sistemas alimentares mais sustentáveis e envolventes para o mundo à nossa volta. Através de florestas alimentares, literacia vegetal e experiências de aprendizagem imersivas, aproximamos as pessoas da forma como os alimentos são cultivados, cuidados e partilhados — tornando a sustentabilidade algo prático, adaptável e verdadeiramente agradável de fazer parte.',

    // ─── Platform Settings ─────────────────────────────────────────────
    'Adjust the experience for this device.': 'Ajuste a experiência para este dispositivo.',
    'Sound': 'Som',
    'Turn experience audio on or off.': 'Ative ou desative o áudio da experiência.',
    'On': 'Ligado',
    'Off': 'Desligado',
    'Volume': 'Volume',
    'Text size': 'Tamanho do texto',
    'Small': 'Pequeno',
    'Medium': 'Médio',
    'Large': 'Grande',
    'Visual quality': 'Qualidade visual',
    'Balanced automatically for this device.': 'Equilibrada automaticamente para este dispositivo.',
    'Automatic': 'Automática',
    'Hints and instructions': 'Dicas e instruções',
    'Show guidance while creating and exploring.': 'Mostre orientações ao criar e explorar.',
    'Build information': 'Informações da compilação',
    'Version:': 'Versão:',
    'Built:': 'Criado:',
    'Target:': 'Alvo:',

    // ─── About This Tool ───────────────────────────────────────────────
    'What is NourishlandXR?': 'O que é o NourishlandXR?',
    'NourishlandXR is a place-based tool that connects information directly to real environments — gardens, food forests, farms, parks and nurseries.': 'O NourishlandXR é uma ferramenta baseada em lugares que liga informação diretamente a ambientes reais — jardins, florestas alimentares, quintas, parques e viveiros.',
    'It helps you record plants, observations, stories and tasks as part of a location. That information can be viewed on a normal screen or experienced in AR through spatial computing and augmented reality.': 'Ajuda-o a registar plantas, observações, histórias e tarefas como parte de uma localização. Essa informação pode ser vista num ecrã normal ou vivenciada em RA através de computação espacial e realidade aumentada.',
    'How it works': 'Como funciona',
    'Every plant, note or checkpoint belongs to a Location and Area. The same content works in both content mode (on-screen) and AR mode (in the landscape), so you can enter data efficiently and explore it spatially when you’re ready.': 'Cada planta, nota ou ponto de controlo pertence a uma Localização e Área. O mesmo conteúdo funciona no modo de conteúdo (no ecrã) e no modo de RA (na paisagem), para poder inserir dados com eficiência e explorá-los espacialmente quando estiver pronto.',
    'Built for food literacy': 'Feito para a literacia alimentar',
    'NourishlandXR is built by Nourishland — an organisation dedicated to helping people grow food, understand plants and build resilient food systems. This tool is part of a larger mission to make sustainability practical, engaging and accessible.': 'O NourishlandXR é criado pela Nourishland — uma organização dedicada a ajudar as pessoas a cultivar alimentos, compreender plantas e construir sistemas alimentares resilientes. Esta ferramenta faz parte de uma missão mais ampla de tornar a sustentabilidade prática, envolvente e acessível.',
    'NourishlandXR turns knowledge about a place into something you can see, edit and share — on screen and in the landscape.': 'O NourishlandXR transforma o conhecimento sobre um lugar em algo que pode ver, editar e partilhar — no ecrã e na paisagem.',

    // ─── Help Guide ────────────────────────────────────────────────────
    'Help Guide': 'Guia de Ajuda',
    'Fast answers while you create.': 'Respostas rápidas enquanto cria.',
    'Quick how-to': 'Como fazer rapidamente',
    'Create in Web Mode: save Plants, Notes and ideas directly, using the Organizer Folder only for items you want to sort or place later.': 'Crie no Modo Web: guarde Plantas, Notas e ideias diretamente, usando a Pasta Organizadora apenas para itens que queira classificar ou colocar mais tarde.',
    'Organise: create Areas for meaningful parts of the landscape.': 'Organize: crie Áreas para partes significativas da paisagem.',
    'Place in AR: open an Area or AR Mode, aim at the real location and place an element.': 'Coloque em RA: abra uma Área ou o Modo RA, aponte para a localização real e coloque um elemento.',
    'Optional journeys: add a Trail Entrance only when visitors need a guided beginning.': 'Percursos opcionais: adicione uma Entrada de Trilho apenas quando os visitantes precisarem de um início guiado.',
    'Explore: use the Field Guide for Plants, Areas and their information.': 'Explore: use o Guia de Campo para Plantas, Áreas e as suas informações.',
    'Frequently asked questions': 'Perguntas frequentes',
    'Do I need AR to begin?': 'Preciso de RA para começar?',
    'No. Web Mode is your database and notebook. Build information first and place it later.': 'Não. O Modo Web é a sua base de dados e caderno. Construa a informação primeiro e coloque-a depois.',
    'What is a Marker?': 'O que é um Marcador?',
    'A Marker is a spatial anchor. It can become a Plant, Note or another useful element.': 'Um Marcador é uma âncora espacial. Pode tornar-se numa Planta, Nota ou outro elemento útil.',
    'What is an Area Totem?': 'O que é um Totem de Área?',
    'A Totem represents one Area and gathers the information belonging to that part of the landscape.': 'Um Totem representa uma Área e reúne a informação que pertence a essa parte da paisagem.',
    'Do I need a Trail Entrance?': 'Preciso de uma Entrada de Trilho?',
    'No. Home already holds anything not assigned to an Area. Add a Trail Entrance only for a guided visitor journey.': 'Não. O Início já guarda tudo o que não está atribuído a uma Área. Adicione uma Entrada de Trilho apenas para um percurso guiado de visitantes.',
    'What happens when I am offline?': 'O que acontece quando estou offline?',
    'Prepared project content remains available locally. New field observations can be synchronised when connectivity returns.': 'O conteúdo preparado do projeto permanece disponível localmente. Novas observações de campo podem ser sincronizadas quando a ligação regressar.',
    'Can I make a mistake?': 'Posso cometer um erro?',
    'Yes—and fix it. Creator tools let you edit, move or remove your own content without changing the underlying real place.': 'Sim — e corrigi-lo. As ferramentas de Criador permitem editar, mover ou remover o seu próprio conteúdo sem alterar o lugar real subjacente.',

    // ─── Common controls ───────────────────────────────────────────────
    'Back': 'Voltar',
    'Back to Dashboard': 'Voltar ao Painel',
    'Back to Web Hub': 'Voltar ao Centro Web',
    'Back to Home': 'Voltar ao Início',
    'Back to Area': 'Voltar à Área',
    'Save': 'Guardar',
    'Save changes': 'Guardar alterações',
    'Cancel': 'Cancelar',
    'Delete': 'Eliminar',
    'Delete Project': 'Eliminar Projeto',
    'Create': 'Criar',
    'Create Area': 'Criar Área',
    'Add': 'Adicionar',
    'Edit': 'Editar',
    'Status': 'Estado',
    'Name': 'Nome',
    'Home': 'Início',
    'Areas': 'Áreas',
    'Area': 'Área',
    'Plants': 'Plantas',
    'Plant': 'Planta',
    'Notes': 'Notas',
    'Note': 'Nota',
    'Checkpoint': 'Ponto de Controlo',
    'Checkpoints': 'Pontos de Controlo',
    'Map': 'Mapa',
    'Site Map': 'Mapa do Local',
    'Language': 'Idioma',
    'Demo': 'Demonstração',
    'Ready': 'Pronto',
    'Hidden': 'Oculto',
    'Draft': 'Rascunho',
    'Published': 'Publicado',
    'Save and exit': 'Guardar e sair',

    // ─── Project Settings (collapsible sections) ───────────────────────
    'Project Settings': 'Definições do Projeto',
    'Project Details': 'Detalhes do Projeto',
    'Update the project name, description and cover image without changing its saved ID, Areas or content.': 'Atualize o nome, a descrição e a imagem de capa do projeto sem alterar o ID guardado, as Áreas ou o conteúdo.',
    'Project name': 'Nome do projeto',
    'Description (optional)': 'Descrição (opcional)',
    'Cover image (optional)': 'Imagem de capa (opcional)',
    'Save Project Details': 'Guardar Detalhes do Projeto',
    'AR Location Note': 'Nota de Localização em RA',
    'A transparent Location Note can be opened from its Area Totem in AR. It stays hidden when AR opens.': 'Uma Nota de Localização transparente pode ser aberta a partir do Totem da Área em RA. Permanece oculta quando a RA abre.',
    'Available': 'Disponível',
    'Unavailable': 'Indisponível',
    'Available from Area Totem': 'Disponível a partir do Totem de Área',
    'Let people view or hide it from the selected Totem toolbar.': 'Deixe as pessoas vê-la ou ocultá-la na barra de ferramentas do Totem selecionado.',
    'Opening question': 'Pergunta de abertura',
    'Location name': 'Nome da localização',
    'Save Location Note': 'Guardar Nota de Localização',
    'Explorer status': 'Estado no Explorador',
    'Choose how this project appears to visitors in Explorer.': 'Escolha como este projeto aparece aos visitantes no Explorador.',
    'Hidden from Explorer': 'Oculto do Explorador',
    'Under construction': 'Em construção',
    'Real location (address)': 'Localização real (endereço)',
    'Creator username': 'Nome de utilizador do criador',
    'Save Explorer Status': 'Guardar Estado do Explorador',
    'Experience level': 'Nível de experiência',
    'Keep the everyday experience calm, or reveal advanced controls when you need them.': 'Mantenha a experiência quotidiana tranquila ou revele controlos avançados quando precisar deles.',
    'Show advanced controls': 'Mostrar controlos avançados',
    'Show themes, technical guidance, diagnostics and other precision tools.': 'Mostre temas, orientação técnica, diagnósticos e outras ferramentas de precisão.',
    'Expert': 'Especialista',
    'Friendly': 'Amigável',
    'Change Theme': 'Alterar Tema',
    'Choose the visual style used while working inside this project.': 'Escolha o estilo visual usado enquanto trabalha neste projeto.',
    'Project theme': 'Tema do projeto',
    'LIGHT (White)': 'CLARO (Branco)',
    'DARK (Black)': 'ESCURO (Preto)',
    'FOREST DARK (Green)': 'FLORESTA ESCURO (Verde)',
    'FOREST LIGHT': 'FLORESTA CLARO',
    'CYBER (Gray / Purple)': 'CIBER (Cinzento / Roxo)',
    'Manage Visitor Entrances': 'Gerir Entradas de Visitantes',
    'Create an optional Trail Entrance for guided visitors.': 'Crie uma Entrada de Trilho opcional para visitantes guiados.',
    'Tutorial & Guidance': 'Tutorial e Orientação',
    'First-use explanations become shorter after successful actions.': 'As explicações da primeira utilização tornam-se mais curtas após ações bem-sucedidas.',
    'Tutorial Mode': 'Modo de Tutorial',
    'Show contextual guidance beside the feature being learned.': 'Mostre orientação contextual junto à funcionalidade que está a aprender.',
    'Restart Tutorial for This Project': 'Reiniciar Tutorial deste Projeto',
    'Reset Learning Tips': 'Repor Dicas de Aprendizagem',
    'AR Tutorial & Hints': 'Tutorial e Dicas de RA',
    'Control the compact guidance shown inside Creator AR Mode.': 'Controle a orientação compacta mostrada no Modo RA de Criador.',
    'Not started': 'Não iniciado',
    'In progress': 'Em curso',
    'Completed': 'Concluído',
    'Skipped': 'Ignorado',
    'Show AR Hints': 'Mostrar Dicas de RA',
    'Show short surface-detection and placement reminders when they are useful.': 'Mostre lembretes curtos de deteção de superfície e colocação quando forem úteis.',
    'Replay AR Tutorial': 'Repetir Tutorial de RA',
    'Reset AR Learning Tips': 'Repor Dicas de Aprendizagem de RA',
    'Developer Diagnostics': 'Diagnósticos de Programador',
    'Keep technical AR launch details hidden during normal use.': 'Mantenha os detalhes técnicos de arranque da RA ocultos durante o uso normal.',
    'Debug on': 'Depuração ligada',
    'Debug off': 'Depuração desligada',
    'AR debug logging': 'Registo de depuração de RA',
    'Write AR launch stages to the browser console for technical testing.': 'Escreva as fases de arranque da RA na consola do navegador para testes técnicos.',
    'Physical Marker prototype': 'Protótipo de Marcador Físico',
    'Enable experimental printed ArUco anchors in Totem Alignment.': 'Ative âncoras ArUco impressas experimentais no Alinhamento de Totens.',
    'Copy Diagnostics': 'Copiar Diagnósticos',
    'Diagnostics remain hidden from the camera view.': 'Os diagnósticos permanecem ocultos da vista da câmara.',
    'Backup Project to File': 'Cópia de Segurança do Projeto para Ficheiro',
    'Coming Soon': 'Em Breve',
    'Exports a configuration file containing all project data, Areas, content and settings.': 'Exporta um ficheiro de configuração com todos os dados do projeto, Áreas, conteúdo e definições.',
    'Backup Project': 'Cópia de Segurança do Projeto',
    'Permanently deletes this project, all Areas and all content. This cannot be undone.': 'Elimina permanentemente este projeto, todas as Áreas e todo o conteúdo. Esta ação não pode ser anulada.',

    // ─── Dashboard tools ───────────────────────────────────────────────
    'NourishlandXR Settings': 'Definições do NourishlandXR',
    'Web Hub': 'Centro Web',
    'Field Guide': 'Guia de Campo',
    'Visitor Entrances': 'Entradas de Visitantes',
    'Stories & Checkpoints': 'Histórias e Pontos de Controlo',
    'Create and Manage': 'Criar e Gerir',
    'Unplaced Content': 'Conteúdo Não Colocado',
    'Add first Plant': 'Adicionar primeira Planta',
    'Create first Area': 'Criar primeira Área',
    'Create first Totem': 'Criar primeiro Totem',
    'Create first Plant Profile': 'Criar primeiro Perfil de Planta',
    'Create 2 Plant Profiles': 'Criar 2 Perfis de Planta',
    'Create a Plant Profile': 'Criar um Perfil de Planta',
    'Add a Plant': 'Adicionar uma Planta',
    'Add a Note': 'Adicionar uma Nota',
    'Add an Information Note': 'Adicionar uma Nota de Informação',
    'Add 5 Plants': 'Adicionar 5 Plantas',
    'Add 1 Area': 'Adicionar 1 Área',
    'Add 1 Note': 'Adicionar 1 Nota',
    'Open in AR': 'Abrir em RA',
    'OPEN IN AR': 'ABRIR EM RA',
    'PLACE IN AR': 'COLOCAR EM RA',
    'DELETE': 'ELIMINAR',
    'Name your Area': 'Nomeie a sua Área',
    'CREATE YOUR FIRST AREA': 'CRIE A SUA PRIMEIRA ÁREA',
    'Create an Area': 'Criar uma Área',
    'Open Area': 'Abrir Área',
    'Content in this Area': 'Conteúdo nesta Área',
    'Add content': 'Adicionar conteúdo',
    'Back to Content': 'Voltar ao Conteúdo',
    'Create new Area': 'Criar nova Área',
    'Edit Area Marker': 'Editar Marcador de Área',
    'Add Area Marker': 'Adicionar Marcador de Área',
    'Area Totem': 'Totem de Área',
    'Area checkpoint': 'Ponto de Controlo de Área',
    'Save Totem': 'Guardar Totem',
    'Save Totem changes': 'Guardar alterações do Totem',
    'Location': 'Localização',
    'Locations': 'Localizações',
    'Site': 'Local',
    'No Areas yet': 'Ainda não há Áreas',
    'No entries': 'Não há entradas',
    'No entries have been added yet.': 'Ainda não foram adicionadas entradas.',
    'Return to Dashboard': 'Voltar ao Painel'
};

const lookup = text => {
    if (!text) return null;
    const direct = PHRASES[text];
    if (direct) return direct;
    const lower = PHRASES[text.toLocaleLowerCase()];
    return lower || null;
};

export function translateApp(root = document.body) {
    if (currentNxrLanguage() !== 'pt-PT') return root;
    if (!root) return root;

    const textChanges = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.parentElement?.closest('script,style,noscript,textarea,option,[data-nxr-skip]')) continue;
        const raw = node.nodeValue || '';
        const trimmed = normalize(raw);
        if (!trimmed) continue;
        const replacement = lookup(trimmed);
        if (replacement && replacement !== trimmed) {
            const leading = raw.slice(0, raw.indexOf(trimmed));
            const trailing = raw.slice(raw.indexOf(trimmed) + trimmed.length);
            textChanges.push([node, leading + replacement + trailing]);
        }
    }
    textChanges.forEach(([node, value]) => { node.nodeValue = value; });

    root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(element => {
        if (element.closest('[data-nxr-skip]')) return;
        ['placeholder', 'aria-label', 'title'].forEach(attribute => {
            const value = element.getAttribute(attribute);
            if (!value) return;
            const trimmed = normalize(value);
            const replacement = lookup(trimmed);
            if (replacement && replacement !== trimmed) element.setAttribute(attribute, replacement);
        });
    });

    return root;
}

export function languageOptionsMarkup(selected = currentNxrLanguage()) {
    return Object.entries(SUPPORTED_LANGUAGES)
        .map(([code, label]) => `<option value="${code}" ${code === selected ? 'selected' : ''}>${label}</option>`)
        .join('');
}