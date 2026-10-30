/* Definición del formulario de evaluación de clubes (extraído del HTML v7 por
   scripts/extraer-formulario.py). La comparten el frontend y el backend. */
export const FORM_ID = "evaluacion-clubes-femenino-2027";
export const FORM_VERSION = "6";

export const CLUBES = ["Academia Puerto Cabello","AC Deportivo Lara","ADIFFEM","AFF Yurubí JSE","Barquisimeto Sport Club","Carabobo FC","Caracas FC","Deportivo La Guaira FC","Deportivo Miranda","Futuros Vinotinto","Marítimo de La Guaira","Metropolitanos FC","Secasports","UCV FC","Otro (escríbalo abajo)"];
export const NOSE = "No sé / Debo consultarlo";
export const NECES = ["Transporte para traslados y partidos de visitante","Alojamiento","Hidratación (agua, bebidas deportivas)","Calzado deportivo","Balones y material de entrenamiento","Productos de higiene y cuidado personal","Atención médica y fisioterapia","Seguro médico para jugadoras","Gimnasio y preparación física"];

export const MODS = [
{ id:"club", pl:"Base de datos de clubes", fi:"P2 Licencia de clubes", tag:"Módulo 0 · Todos", titulo:"Datos del club", quien:"Lo responde la gerencia del club. Estos datos se piden una sola vez y sirven para todos los módulos.", qs:[
  {id:"club",t:"Nombre del club",type:"select",o:CLUBES,req:1},
  {id:"club_otro",t:"Si marcó «Otro», escriba el nombre del club",type:"text",if:["club","Otro (escríbalo abajo)"]},
  {id:"ciudad",t:"Ciudad y estado de la sede principal",type:"text",ph:"Ejemplo: Mérida, estado Mérida"},
  {id:"responde",t:"Quién llena el formulario",type:"text",ph:"Nombre, apellido y cargo"},
  {id:"correo",t:"Correo institucional del club (no el personal de quien llena el formulario)",type:"email",req:1},
  {id:"telefono",t:"Teléfono de contacto",type:"tel",ph:"0414-0000000"},
  {id:"firma",t:"Quién aprueba o firma los acuerdos comerciales del club",type:"text",h:"Nombre, apellido y cargo. Si es la misma persona, escriba «La misma persona»."},
  {id:"sede",t:"Estadio o cancha donde proyectan jugar de local en 2027",type:"text",h:"Nombre e instalación y ciudad. Si no lo saben, escriban «Por definir»."},
  {id:"sede_conf",t:"¿La sede de local para 2027 está confirmada?",type:"radio",o:["Sí, confirmada y garantizada","En gestión o evaluación","Aún no tenemos sede definida",NOSE]},
  {id:"sede_tipo",t:"¿Dónde juega hoy el equipo femenino de local?",type:"radio",o:["Estadio principal del club (el mismo del masculino)","Estadio municipal o de terceros, sede fija","Cancha de entrenamiento o complementaria","Sede variable según disponibilidad"]},
  {id:"redes",t:"Redes oficiales del equipo femenino",type:"redes",h:"Complete solo las redes que usan. Si no tienen, escriba «no tenemos» en la primera."},
  {id:"seguidores_red",t:"Número de seguidores del equipo femenino por red",type:"numred",rows:["Instagram","TikTok","X","Facebook","YouTube"],h:"Cifra aproximada al día de hoy. Deje en blanco las redes que no usan."},
  {id:"web",t:"Página web del club",type:"text",ph:"https://"}
]},
{ id:"deportivo", pl:"Competencia Nacional", fi:"P5 Desarrollo de Ligas · P2 Licencia de clubes", tag:"Módulo 1 · Deportivo y operativo", titulo:"Deportivo y operativo", quien:"Lo responde la dirección deportiva o la coordinación del fútbol femenino.", qs:[
  {id:"plantel",t:"Jugadoras inscritas en el primer equipo en 2026",type:"number"},
  {id:"menores",t:"De ellas, ¿cuántas son menores de 18 años?",type:"number"},
  {id:"exterior",pl:"Selecciones Nacionales",t:"Jugadoras formadas en el club que salieron al exterior en los últimos dos años",type:"number",h:"Universidades o clubes. Si no lo sabe, déjelo en blanco."},
  {id:"categorias",pl:"Desarrollo y Masificación",t:"Categorías femeninas que tiene el club además del primer equipo",type:"check",o:["Sub-13","Sub-15","Sub-17","Sub-20","Futsal femenino","Convenio con otra academia o club para las categorías juveniles (indique cuál)","Ninguna"]},
  {id:"categorias_convenio",t:"¿Con qué academia o club tienen el convenio y para qué categorías?",type:"text",if:["categorias","Convenio con otra academia o club para las categorías juveniles (indique cuál)"]},
  {id:"dt_licencia",pl:"Capacitación y Formación Profesional",t:"Licencia de la persona que dirige el primer equipo",h:"Para la Temporada Élite 2027 se exige como mínimo licencia B.",type:"radio",o:["CONMEBOL Pro","CONMEBOL A","CONMEBOL B","CONMEBOL C","Sin licencia",NOSE]},
  {id:"cuerpo_tecnico",t:"Cargos con que cuenta el cuerpo técnico del primer equipo",type:"check",o:["Asistente técnico","Preparación física","Entrenador de arqueras","Médico","Fisioterapia","Psicología","Nutrición","Delegado o delegada"]},
  {id:"contratos",t:"Situación contractual de las jugadoras",type:"radio",o:["Todas con contrato registrado en la FVF","Parte del plantel con contrato","Ninguna con contrato","En proceso de formalizarlo"]},
  {id:"pago",t:"¿Cómo reciben ingresos las jugadoras?",type:"radio",o:["Salario fijo","Viáticos o ayuda económica","Combinado (algunas salario, otras viáticos)","No reciben pago"]},
  {id:"seguro",t:"¿Las jugadoras tienen seguro médico?",type:"radio",o:["Sí, todo el plantel","Solo una parte","No",NOSE]},
  {id:"seg_personas",t:"Seguro médico: si la FVF gestiona una póliza colectiva, ¿cuántas personas habría que asegurar en su club?",type:"number",h:"Jugadoras del primer equipo y de categorías formativas, más cuerpo técnico.",pl:"Plan Maestro Liga · Unidades de negocio (seguro médico centralizado)",fi:"P5 Desarrollo de Ligas"},
  {id:"seg_cobertura",t:"¿Qué cubre el seguro que tienen hoy?",type:"check",o:["Accidentes deportivos","Hospitalización y cirugía","Cobertura médica general","No tenemos seguro"],pl:"Plan Maestro Liga · Unidades de negocio (seguro médico centralizado)"},
  {id:"seg_costo",t:"Costo actual del seguro por jugadora al año",type:"radio",o:["Menos de 50 USD","50 a 150 USD","151 a 300 USD","Más de 300 USD","No tenemos seguro","Prefiero no decirlo"],pl:"Plan Maestro Liga · Unidades de negocio (seguro médico centralizado)"},
  {id:"seg_modelo",t:"Si la FVF negocia una póliza para todas las jugadoras, ¿qué modelo aceptaría su club?",type:"radio",o:["El club paga el total","Costo compartido FVF-club","Otro"],nota:"Pregunta exploratoria, no compromete a la FVF",pl:"Plan Maestro Liga · Unidades de negocio (seguro médico centralizado)",fi:"P5 Desarrollo de Ligas · P6 Estrategia comercial piloto"},
  {id:"seg_otra",t:"¿Qué otra opción propone para cubrir el seguro de sus jugadoras?",type:"textarea",pl:"Plan Maestro Liga · Unidades de negocio (seguro médico centralizado)",fi:"P5 Desarrollo de Ligas · P6 Estrategia comercial piloto"},
  {id:"seg_atencion",t:"Cuando una jugadora se lesiona hoy, ¿cómo se atiende?",type:"check",o:["Clínica privada pagada por el club","Hospital público","Médico del club","La jugadora lo paga por su cuenta"],pl:"Plan Maestro Liga · Unidades de negocio (seguro médico centralizado)"},
  {id:"superficie",t:"Superficie de la cancha de local",type:"radio",o:["Césped natural","Césped sintético","Varía según el partido"]},
  {id:"cancha",t:"Estado de la instalación donde juegan de local",type:"grid",rows:["Estado del césped","Iluminación para partidos nocturnos","Camerinos","Duchas y agua","Gradas para el público","Servicio médico y ambulancia"],cols:["Bueno","Regular","Malo","No tiene"]},
  {id:"horario",t:"Horario preferido para jugar de local",type:"radio",o:["Antes de las 10:00 a. m.","Después de las 4:00 p. m.","Nocturno","Indiferente"]},
  {id:"criterios",t:"¿Cuánto le importa a su club cada uno de estos puntos al definir el formato 2027?",type:"grid",rows:["Jugar más partidos en el año","Menor costo de traslados","Que la competencia mantenga interés hasta la última fecha","Un campeón nacional claro","Minutos para jugadoras juveniles","Continuidad de juego hasta la Copa Libertadores","Que no haya pausas largas en el calendario"],cols:["Poco","Medio","Mucho"],h:"La mesa de trabajo del formato usa estos mismos criterios."},
  {id:"arbitraje",t:"Calidad del arbitraje en la temporada 2026",type:"scale",min:"Muy baja",max:"Muy alta"},
  {id:"delegados",t:"Desempeño de los delegados de partido en 2026",type:"scale",min:"Muy bajo",max:"Muy alto"},
  {id:"costos",t:"Ordene los costos que más pesan en el presupuesto del equipo",type:"rank",o:["Traslados","Hospedaje y alimentación","Alquiler de cancha","Pago a jugadoras y cuerpo técnico","Servicio médico"],h:"Use las flechas. Arriba, el que más pesa."},
  {id:"licencias",t:"¿Quieren participar en el seminario de Licencia de Clubes para la Liga FUTVE Fem?",type:"radio",o:["Sí","No","Ya participamos",NOSE]},
  {id:"elegibles",pl:"Plan Maestro Liga · Pasaporte Digital",t:"Número de jugadoras de 15 a 18 años en el plantel",type:"number",h:"La regla de minutaje juvenil pide al menos 8 elegibles inscritas por plantel."},
  {id:"registro12",pl:"Plan Maestro Liga · Pasaporte Digital",t:"¿Las jugadoras de sus categorías formativas están registradas en COMET desde los 12 años?",type:"radio",o:["Sí, todas","Una parte","No","No tenemos categorías formativas"],h:"Sin ese historial, el derecho de formación y la solidaridad no se pueden reclamar."},
  {id:"clearing",pl:"Plan Maestro Liga · Pasaporte Digital",t:"¿El club tiene cuenta en la FIFA Clearing House?",type:"radio",o:["Sí","En trámite","No",NOSE]},
  {id:"preparacion27",t:"¿Qué tan preparado está su club para la temporada 2027?",type:"scale",min:"Nada preparado",max:"Totalmente preparado"},
  {id:"preparacion27_falta",t:"¿Qué le falta?",type:"textarea"},
  {id:"prog5",fi:"P5 Desarrollo de Ligas",t:"Ordene las líneas de inversión del Programa de Desarrollo de Ligas (FIFA) según lo que más ayuda a su club",type:"rank",o:["Streaming y comercialización","Dotación centralizada (balones, material, kits)","Alivio logístico (traslados y jornada)"],h:"Arriba, la que más ayuda."},
  {id:"unidades",pl:"Plan Maestro Liga · Producto y comercial",fi:"P6 Estrategia comercial piloto",t:"Unidades de negocio que le interesa explorar",type:"check",o:["Seguro médico centralizado","Canteras colegiales (academias del club en colegios)","Ninguna por ahora"]},
  {id:"casa",pl:"Plan Maestro Liga · La Casa de las Nuestras",t:"¿Su club usaría La Casa de las Nuestras (residencia en El Paraíso, Caracas)?",type:"radio",o:["Sí, para jugadoras de otras ciudades","Tal vez, según condiciones","No la necesitamos",NOSE]}
]},
{ id:"base", pl:"Desarrollo y Masificación", fi:"Campaña de promoción (festivales) · P5 Desarrollo de Ligas", tag:"Módulo 2 · Base, formación y protección", titulo:"Base, formación y protección", quien:"Lo responde la coordinación del fútbol femenino o de categorías formativas del club.", qs:[
  {id:"ninas_7_9",t:"Niñas que entrenan en el club de 7 a 9 años",type:"number",h:"Inscritas o no en COMET. Si no lo sabe, déjelo en blanco."},
  {id:"ninas_10_12",t:"Niñas de 10 a 12 años",type:"number"},
  {id:"ninas_13_15",t:"Jugadoras de 13 a 15 años",type:"number"},
  {id:"ninas_16_17",t:"Jugadoras de 16 y 17 años",type:"number"},
  {id:"escuela",t:"¿El club tiene escuela o academia femenina abierta a niñas nuevas?",type:"radio",o:["Sí, gratuita","Sí, con mensualidad","Sí, mixta con varones","No tenemos"]},
  {id:"colegios",t:"¿El club tiene alianzas con colegios o universidades para captar jugadoras?",type:"radio",o:["Sí, con colegios","Sí, con universidades","Con ambos","No"]},
  {id:"festivales",t:"¿El club participó en festivales de fútbol femenino en 2026?",type:"radio",o:["Sí, organizamos uno","Sí, participamos","No"],fi:"Campaña de promoción (festivales)"},
  {id:"sede_festival",t:"¿Podría ser sede de un festival FIFA de fútbol femenino en su estado?",type:"radio",o:["Sí","Sí, con apoyo logístico","No"],fi:"Campaña de promoción (festivales)"},
  {id:"inclusion",t:"¿El club tiene actividad con niñas con discapacidad o alianza con Olimpiadas Especiales?",type:"radio",o:["Sí","Nos interesa empezar","No"]},
  {id:"embajadora",t:"Jugadora del club que podría ser embajadora del fútbol femenino",type:"text",h:"Nombre y por qué. Es opcional.",fi:"P5 Desarrollo de Ligas (embajadoras)"},
  {id:"entrenadoras",t:"Mujeres que trabajan como entrenadoras en el club",type:"number",pl:"Capacitación y Formación Profesional"},
  {id:"entrenadoras_lic",t:"De ellas, ¿cuántas tienen licencia y de qué tipo? (CONMEBOL Pro, A, B, C, otra)",type:"text",ph:"Ejemplo: 2 (1 CONMEBOL B y 1 CONMEBOL C)",pl:"Capacitación y Formación Profesional"},
  {id:"directivas",t:"Mujeres en cargos de dirección o gerencia del club",type:"number",pl:"Capacitación y Formación Profesional",fi:"P13 Liderazgo femenino"},
  {id:"programas_fifa",t:"Programas de formación en los que el club quiere inscribir a su personal",type:"check",o:["Curso de entrenadoras de noviembre","Becas de formación para entrenadoras","Programa de mentores para entrenadoras","Formación para gestores del fútbol femenino","Programa de liderazgo femenino"],pl:"Capacitación y Formación Profesional",fi:"P4 Gestores · P8-P9 Becas · P10-P11 Mentores · P13 Liderazgo"},
  {id:"salvaguarda",t:"¿El club adoptó el Protocolo Nacional de Salvaguarda de la FVF?",type:"radio",o:["Sí, adoptado y difundido","En proceso","No",NOSE],pl:"Plan Maestro Liga · Gerencia (salvaguarda)"},
  {id:"oficial_salv",t:"¿Hay una persona designada como responsable de salvaguarda en el club?",type:"radio",o:["Sí","No",NOSE],pl:"Plan Maestro Liga · Gerencia (salvaguarda)"},
  {id:"medico",t:"¿Las jugadoras pasan una evaluación médica antes de la temporada?",type:"radio",o:["Sí, todas","Solo el primer equipo","No"]},
  {id:"convocadas",t:"Jugadoras del club convocadas a selecciones nacionales en 2026",type:"number",pl:"Selecciones Nacionales"},
  {id:"entreno_caracas",t:"¿El club facilita que sus jugadoras de selección entrenen entre semana en Caracas?",type:"radio",o:["Sí","Según el calendario del club","No, por distancia o costos","No aplica"],pl:"Selecciones Nacionales"}
]},
{ id:"comercial", pl:"Plan Maestro Liga · Producto y comercial", fi:"P6 Estrategia comercial piloto · P5 Desarrollo de Ligas", tag:"Módulo 3 · Patrocinios y necesidades", titulo:"Patrocinios y necesidades", quien:"Lo responde quien maneja los patrocinios o la gerencia del club. No necesitan ser expertos: marquen «No sé» cuando haga falta.", qs:[
  {id:"area_comercial",t:"¿El club tiene un área o departamento de comercialización?",type:"radio",o:["Sí","No"]},
  {id:"resp_patrocinio",t:"¿Tienen a alguien encargado de buscar patrocinios para el equipo femenino?",type:"radio",o:["Sí, y es quien responde este formulario","Sí, es otra persona","No tenemos a alguien en esa función",NOSE]},
  {id:"resp_patrocinio_dato",t:"Nombre, apellido y teléfono de esa persona",type:"text",if:["resp_patrocinio","Sí, es otra persona"]},
  {id:"modelos_patrocinio",t:"¿Tienen propuestas y modelos de negocio definidos para generar ingresos por patrocinio?",type:"radio",o:["Sí","No","En desarrollo"]},
  {id:"asesoria_patrocinio",t:"¿Su club necesita asesoría o mentoría para generar ingresos por patrocinio?",type:"radio",o:["Sí","No"]},
  {id:"acuerdos",t:"Los acuerdos de patrocinio del femenino, ¿se manejan solos o junto con el masculino?",type:"radio",o:["Exclusivos del equipo femenino","Incluidos con el masculino u otras categorías","Combinado",NOSE]},
  {id:"tiene_patrocinio",t:"¿El equipo femenino tiene hoy patrocinadores o alianzas vigentes?",type:"radio",o:["Sí","No",NOSE]},
  {id:"marcas",t:"Empresas o marcas que apoyan al equipo femenino",type:"textarea",h:"Una por línea. Aclare si el apoyo incluye también al masculino.",if:["tiene_patrocinio","Sí"]},
  {id:"tipo_apoyo",t:"Tipo de apoyo que reciben",type:"check",o:["Dinero (patrocinio económico)","Productos o servicios (canje)","Descuentos",NOSE],if:["tiene_patrocinio","Sí"]},
  {id:"canje",t:"Si reciben canje, ¿qué reciben y de qué marca?",type:"textarea",ph:"Ejemplo: la marca X aporta la hidratación de los partidos",if:["tiene_patrocinio","Sí"]},
  {id:"exclusividad",t:"¿Algún acuerdo les impide firmar con empresas del mismo rubro?",type:"textarea",h:"Si pueden tener cualquier marca sin restricción, escriban «Ninguna».",if:["tiene_patrocinio","Sí"]},
  {id:"uniforme",t:"Espacios del uniforme libres para un patrocinador de la Liga en 2027",type:"kit",h:"Marque en la camiseta o en la lista. Gire la vista para ver la espalda."},
  {id:"estadio",t:"Espacios del estadio de local para los patrocinadores de la Liga",type:"estadio",rows:["Valla lateral principal (frente a las cámaras)","Valla lateral opuesta","Valla de fondo izquierdo","Valla de fondo derecho","Backing de entrevistas","Zona de stands y activaciones de marca","Plataforma de cámaras de transmisión","Túnel y salida de jugadoras","Bancos de suplentes","Vomitorios a tiro de cámara","Lona del círculo central","Vallas o tapetes junto a los arcos"],cols:["Disponible","Requiere autorización","No disponible","No lo tenemos"],h:"Toque una zona del plano para ubicarla en la lista y marque su estado."},
  {id:"espacios",t:"Otros espacios y canales para los patrocinadores de la Liga",type:"grid",rows:["Internet en la sede para la transmisión","Redes del club para publicar contenido de patrocinadores","Página web para logos de patrocinadores","Camisetas o artículos oficiales a la venta","Protocolo de inicio","Niños escolta","Niños bandera","Entrega de premios especiales de una marca"],cols:["Disponible","Requiere autorización","No disponible","No lo tenemos","Debemos consultarlo"]},
  {id:"imagen",t:"¿Tienen autorización firmada de las jugadoras para usar su imagen en publicidad?",type:"radio",o:["Sí, de todo el plantel","Solo de algunas jugadoras","No tenemos autorizaciones firmadas","Debo consultarlo con la directiva"]},
  {id:"necesidades",t:"Las 5 necesidades principales del equipo para competir",type:"check",o:NECES.concat(["Otra (indíquela en comentarios)"]),max:5,h:"Marque hasta cinco."},
  {id:"urgente",t:"De esas necesidades, ¿cuál es la más urgente?",type:"text"},
  {id:"cubierto",t:"¿Qué parte de esas necesidades ya tienen cubierta?",type:"textarea",ph:"Ejemplo: transporte, la mitad de los viajes; hidratación, toda, con un aliado local"},
  {id:"central",t:"¿Qué le gustaría que la Liga gestione de forma centralizada para todos los clubes?",type:"check",o:NECES}
]},
{ id:"marca", pl:"Plan Maestro Liga · Producto y comercial", fi:"P6 Estrategia comercial piloto · Campaña de promoción", tag:"Módulo 4 · Marca y activación", titulo:"Marca y activación", quien:"Lo responde quien lleva el mercadeo del club o la gerencia. Toma unos 8 minutos.", qs:[
  {id:"gestion_mkt",t:"¿Quién gestiona el mercadeo del equipo femenino?",type:"radio",o:["Una persona o equipo exclusivo del femenino","El equipo del masculino, con tiempo asignado al femenino","El equipo del masculino, sin tiempo asignado","Cuerpo técnico, delegado o jugadoras","Nadie lo gestiona"]},
  {id:"presupuesto_mkt",t:"¿El club asigna presupuesto al mercadeo del femenino?",type:"radio",o:["Sí, tiene presupuesto asignado","No tiene presupuesto asignado"]},
  {id:"identidad",t:"¿Qué identidad usa el equipo femenino?",type:"radio",o:["El mismo escudo, nombre y colores del club","El escudo del club con un agregado («Femenino», «Fem»)","Logo propio con los colores del club","Identidad propia (nombre, logo y colores)"]},
  {id:"manual",t:"¿Tiene manual de marca o lineamientos gráficos?",type:"radio",o:["Sí, completo y vigente","Solo logo y colores definidos","En desarrollo","No tiene"]},
  {id:"representa",t:"En una frase, ¿qué representa su equipo femenino para su club o su comunidad?",type:"text"},
  {id:"reconoce_club",t:"¿Qué tan reconocida es la marca de su equipo femenino en su ciudad?",type:"scale",min:"Muy poco",max:"Mucho"},
  {id:"reconoce_liga",t:"¿Qué tan reconocida y valorada percibe la marca Liga FUTVE Fem?",type:"scale",min:"Muy poco",max:"Mucho"},
  {id:"aporte_liga",t:"¿Qué le aporta hoy la marca Liga FUTVE Fem a su club?",type:"check",o:["Visibilidad","Prestigio e identidad","Material gráfico para el estadio","Muy poco"]},
  {id:"aporte_liga_porque",t:"¿Por qué?",type:"textarea",if:["aporte_liga","Muy poco"]},
  {id:"asistencia",t:"Asistencia promedio por partido de local",type:"radio",o:["Menos de 100 personas","100 a 300","301 a 1.000","Más de 1.000","No se conoce"]},
  {id:"publico",t:"Público principal",type:"check",o:["Familiares de jugadoras","Niñas y jóvenes de escuelas de fútbol","Aficionados del club","Comunidad local"]},
  {id:"registro_publico",t:"¿Cómo registra la asistencia y a sus aficionados?",type:"radio",o:["Taquilla o conteo de entradas","Conteo estimado a la vista","Base de datos de aficionados (nombre y contacto)","No se registra"]},
  {id:"barrera",t:"Principal barrera para atraer público",type:"radio",o:["Poca difusión del partido","Horario poco conveniente","Estadio lejano o de difícil acceso","Inseguridad o falta de transporte","Poco interés en el fútbol femenino","Otros (especifique)"]},
  {id:"barrera_otro",t:"Especifique la otra barrera",type:"text",if:["barrera","Otros (especifique)"]},
  {id:"promocion",t:"¿Cómo promociona cada partido de local?",type:"check",o:["Afiches o volantes","Convocatoria a escuelas y colegios","Medios locales o perifoneo","Las jugadoras invitan a su entorno","No se promociona"]},
  {id:"anticipacion",t:"¿Con cuánta anticipación inicia la promoción?",type:"radio",o:["El mismo día","1 a 2 días antes","3 a 7 días antes","Más de 7 días antes","No se promociona"]},
  {id:"llegada",t:"¿Hay experiencia de llegada al estadio (recibimiento, música, ambientación)?",type:"radio",o:["Sí, en todos los partidos de local","Solo en partidos especiales","No, solo se abren las puertas"]},
  {id:"durante",t:"Acciones durante el partido",type:"check",o:["Presentador o DJ","Salida de jugadoras con niñas","Activaciones en el entretiempo","Sorteos o premios","Dinámicas con el público","Otros (especifique)","Ninguna"]},
  {id:"durante_otro",t:"Especifique las otras acciones durante el partido",type:"text",if:["durante","Otros (especifique)"]},
  {id:"elementos",t:"Elementos de marca en el estadio",type:"check",o:["Vallas","Lonas o banners del club","Backing de entrevistas","Señalética del club","Señalética de la Liga FUTVE Fem","Otros (especifique)","Ninguno"]},
  {id:"elementos_otro",t:"Especifique los otros elementos de marca",type:"text",if:["elementos","Otros (especifique)"]},
  {id:"productos",t:"Productos del equipo femenino (camisetas, bufandas) en el partido",type:"radio",o:["Se venden en el estadio","Se regalan o sortean","Existen, pero solo para las jugadoras","No hay productos del equipo femenino"]},
  {id:"post",t:"Acciones al terminar el partido",type:"check",o:["Fotos o autógrafos con jugadoras","Reconocimiento a la jugadora del partido","Agradecimiento al público","Otros (especifique)","Ninguna"]},
  {id:"post_otro",t:"Especifique las otras acciones al terminar el partido",type:"text",if:["post","Otros (especifique)"]},
  {id:"reporte_mkt",t:"¿Registra los resultados de mercadeo de cada partido?",type:"radio",o:["Sí, con un reporte por partido","Solo la asistencia","No se registra"]},
  {id:"prioridades_mkt",t:"Ordene las necesidades de mercadeo de su club",type:"rank",o:["Identidad y material gráfico","Promoción previa al partido","Ambiente y activaciones durante el partido","Cierre y post partido","Asistencia de público","Formación del personal de mercadeo"],h:"Arriba, la más urgente."},
  {id:"prioridades_mkt_otra",t:"¿Alguna otra necesidad?",type:"text",h:"Opcional."},
  {id:"apoyo_unico",t:"Si la Liga pudiera darle un solo apoyo de marca o activación esta temporada, ¿cuál sería?",type:"text"},
  {id:"conjuntas",t:"¿Sumaría activaciones conjuntas con Liga FUTVE Junior, FUTVE 1 o FUTVE 2 en sus partidos?",type:"radio",o:["Sí, en todos los partidos de local","Sí, en partidos seleccionados","Depende de costos o logística","No"]}
]},
{ id:"prensa", pl:"Plan Maestro Liga · Producto y comercial", fi:"P5 Desarrollo de Ligas (plan de comunicación y embajadoras)", tag:"Módulo 5 · Prensa y comunicaciones", titulo:"Prensa y comunicaciones", quien:"Lo responde la persona a cargo de prensa y redes del club.", qs:[
  {id:"resp_com",t:"Nombre y cargo del responsable de comunicaciones del club",type:"text"},
  {id:"correo_com",t:"Correo institucional de comunicaciones",type:"email",h:"Si es el mismo del Módulo 0, déjelo en blanco."},
  {id:"personas_com",t:"¿Cuántas personas forman el equipo de prensa y comunicaciones?",type:"number"},
  {id:"integrantes_com",t:"Indique nombre, cargo y función de cada integrante",type:"textarea",h:"Una persona por línea."},
  {id:"exclusivo_com",t:"¿Hay personal de comunicaciones dedicado solo al equipo femenino?",type:"radio",o:["Sí","No"]},
  {id:"funciones",t:"Funciones que cubre el equipo de prensa",type:"check",o:["Redacción","Fotografía","Producción audiovisual","Gestión de redes sociales","Diseño gráfico","Coordinación de prensa"]},
  {id:"equipos",t:"Equipos y herramientas",type:"grid",rows:["Cámara fotográfica profesional o semiprofesional","Cámara de video profesional o semiprofesional","Micrófonos externos","Programas de edición de foto y video","Herramientas de diseño (Canva, Photoshop, Illustrator)","Internet estable en las instalaciones del club"],cols:["Sí","No","Acceso limitado"]},
  {id:"conexion",t:"Conexión que usan en las coberturas fuera del club",type:"check",o:["Datos móviles","Wi-Fi de la instalación deportiva","Conexión satelital (Starlink)","Dispositivo de conexión móvil (BAM)"]},
  {id:"frecuencia",t:"¿Con qué frecuencia publican sobre el equipo femenino?",type:"radio",o:["A diario","Varias veces por semana","Una vez por semana","Solo en partidos o eventos","Ocasionalmente"]},
  {id:"contenidos",t:"Contenidos que producen para dar visibilidad al equipo femenino",type:"check",o:["Fotografías","Videos largos","Reels o Shorts","Entrevistas","Notas de prensa","Transmisiones en vivo"]},
  {id:"banco_fotos",t:"¿Tienen un banco organizado de fotos y videos del equipo femenino?",type:"radio",o:["Sí","No"]},
  {id:"media_day",t:"¿Hacen jornadas de producción de contenido (Media Day) en pretemporada?",type:"radio",o:["Sí","No","Depende de las condiciones"]},
  {id:"grilla",t:"¿Tienen una planificación de contenidos para las redes del femenino?",type:"radio",o:["Sí","No"]},
  {id:"cob_recursos",t:"Personal y equipos para cubrir los partidos de local y de visitante",type:"textarea"},
  {id:"cob_local",t:"¿Cómo organizan la cobertura digital cuando juegan de local?",type:"textarea",h:"Contenidos, plataformas y quién hace qué antes, durante y después del partido."},
  {id:"cob_visita",t:"¿Cómo cubren los partidos de visitante?",type:"textarea",h:"Personal disponible, acceso a material audiovisual y limitaciones."},
  {id:"medios_rel",t:"¿Mantienen relación con medios locales o nacionales para visibilizar el trabajo de su equipo femenino?",type:"radio",o:["Sí","De forma ocasional","No"]},
  {id:"medios_tipo",t:"Tipo de medios con los que se relacionan",type:"check",o:["Prensa escrita","Radio","Televisión","Medios digitales","Influencers o cuentas deportivas"]},
  {id:"medios_cuales",t:"Mencione los principales medios y periodistas con los que se relaciona",type:"textarea"},
  {id:"contactos_prensa",t:"¿Tienen una base de datos actualizada de periodistas y medios locales y nacionales?",type:"radio",o:["Sí","No","En elaboración"]},
  {id:"proveedores",t:"¿Trabajan o han trabajado con proveedores externos de producción audiovisual, diseño gráfico, fotografía o cobertura de partidos?",type:"check",o:["Producción audiovisual","Diseño gráfico","Fotografía","Cobertura de partidos","Ninguno"],h:"Marque todas las que apliquen."},
  {id:"voceria",t:"¿Quién ejerce la vocería del club sobre el equipo femenino?",type:"radio",o:["Presidencia o gerencia general","Dirección o coordinación del fútbol femenino","Departamento de comunicaciones","Cuerpo técnico","Jugadoras","Depende del tema","No hay una vocería definida"]},
  {id:"crisis",t:"¿Tienen un plan de acción o protocolo de crisis para situaciones que afecten la imagen del equipo femenino?",type:"radio",o:["Protocolo específico para el femenino","Protocolo general de crisis para todo el club","Sin protocolo, pero con responsables definidos","Se maneja caso por caso","No hay procedimientos definidos"]},
  {id:"desafios",t:"Situaciones que fueron un reto de comunicación en el último año",type:"check",o:["Controversias arbitrales","Conflictos internos con jugadoras o cuerpo técnico","Denuncias o señalamientos públicos","Discriminación o violencia","Información falsa o rumores en redes","Críticas a la gestión deportiva o institucional","Dificultad para comunicar decisiones institucionales","Dificultad para difundir actividades o resultados","No hemos tenido situaciones relevantes"]},
  {id:"comentarios",t:"Comentarios, propuestas o necesidades que debamos tomar en cuenta",type:"textarea",h:"Espacio libre para cualquier tema de los cinco módulos."}
]}
];
export const AREAS = {
  general:{nombre:"General", resp:"Andreina Peláez y Crismarys Cedeño", mods:null},
  competiciones:{nombre:"Competiciones", resp:"Jesús Sánchez y equipo de Competiciones", mods:{club:"*",deportivo:"*",base:"*"}},
  mercadeo:{nombre:"Mercadeo", resp:"Gabriel Harting", mods:{club:["redes","seguidores_red","web"],comercial:["uniforme","estadio","espacios"],marca:"*"}},
  comunicaciones:{nombre:"Comunicaciones", resp:"María Daniela Innecco y Merian Silva", mods:{club:["redes","seguidores_red","web"],prensa:"*"}},
  comercializacion:{nombre:"Comercialización", resp:"John Colina y Leonardo Mora", mods:{deportivo:["seguro","seg_personas","seg_cobertura","seg_costo","seg_modelo","seg_otra","seg_atencion","prog5","unidades"],comercial:"*"}}
};

/* Índice id de pregunta → pregunta */
export const QIDX = {};
MODS.forEach((m) => m.qs.forEach((q) => (QIDX[q.id] = q)));

/* Pilar del Plan Maestro y programa FIFA de cada pregunta */
export function mapa() {
  const m = {};
  MODS.forEach((mod) => mod.qs.forEach((q) => (m[q.id] = { modulo: mod.titulo, pilar: q.pl || mod.pl, fifa: q.fi || mod.fi })));
  return m;
}

/* Misma regla que el formulario para saber si una pregunta está respondida */
export function answered(q, v) {
  if (v == null) return false;
  if (q.type === "grid" || q.type === "estadio" || q.type === "numred") return Object.values(v).some(Boolean);
  if (q.type === "redes") return Object.values(v).some((o) => o && o.usuario);
  return Array.isArray(v) ? v.length > 0 : !!v;
}

/* Avance por módulo y total (las preguntas condicionales no cuentan, igual que en el formulario) */
export function avance(r) {
  const out = { modulos: {}, respondidas: 0, total: 0 };
  MODS.forEach((m) => {
    let t = 0, d = 0;
    m.qs.forEach((q) => { if (q.if) return; t++; if (answered(q, r[q.id])) d++; });
    out.modulos[m.id] = { respondidas: d, total: t };
    out.respondidas += d; out.total += t;
  });
  out.porcentaje = out.total ? Math.round((out.respondidas / out.total) * 100) : 0;
  return out;
}
