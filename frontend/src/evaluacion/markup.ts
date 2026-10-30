/* Estructura HTML del formulario v7 original (body), con el plazo dinámico y el texto de guardado actualizado. */
export const MARKUP = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="pp" viewBox="0 0 18 26"><circle cx="9" cy="4.2" r="3.4"/><path d="M4.2 9.2c.5-1 1.5-1.6 2.6-1.6h4.4c1.1 0 2.1.6 2.6 1.6l2.6 6-2.4 1-1.6-3.4V25h-2.6v-8.6H8.2V25H5.6V12.8L4 16.2l-2.4-1z"/></symbol>
</svg>
<header class="cover">
  <svg class="cv-pat" viewBox="0 0 560 560" aria-hidden="true"><g fill="none" stroke="#E856EF" stroke-width="2"><circle cx="280" cy="280" r="270" stroke-opacity=".18"/><circle cx="280" cy="280" r="222" stroke-opacity=".22"/><circle cx="280" cy="280" r="174" stroke-opacity=".26" stroke-dasharray="220 40"/><circle cx="280" cy="280" r="126" stroke-opacity=".3"/><circle cx="280" cy="280" r="78" stroke-opacity=".34" stroke-dasharray="120 30"/></g></svg>
  <div class="cv-in">
    <div class="cv-top">
      <div class="logos">
        <img id="lg1" alt="Liga FUTVE Fem">
        <span class="sep"></span>
        <img id="lg2" alt="Federación Venezolana de Fútbol">
      </div>
      <span class="cv-fvf">FVF</span>
    </div>
    <div class="cv-kick">Liga FUTVE Fem · Temporada 2027</div>
    <h1>Evaluación de clubes <b>Fútbol <em>femenino</em> 2027</b></h1>
    <p>Federación Venezolana de Fútbol</p>
    <div class="cv-why">Sus respuestas son la base del <b>Master Plan del fútbol femenino</b>.</div>
    <div class="cv-meta">
      <div><span>Plazo</span><strong id="cvplazo">—</strong><small id="cvplazod"></small></div>
      <div><span>Módulos</span><strong id="cvmods">6</strong><small>uno por área del club</small></div>
      <div><span>Preguntas</span><strong id="cvqs">137</strong><small>solo dos obligatorias</small></div>
      <div><span>Dudas</span><strong>Andreina Peláez</strong><small>andreina.pelaez@fvf.com.ve</small></div>
    </div>
    <div class="cv-crests" id="cvcrests"></div>
    <button type="button" class="cv-go" id="cvgo">Empezar <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
  </div>
</header>

<main>
  <div class="intro" id="intro">
    <h2>Para qué sirve <b>esta evaluación</b></h2>
    <p>Es el diagnóstico que acordamos en el Encuentro con clubes del 8 de octubre. Con sus respuestas cerramos la Fase I del Plan Maestro 2026-2028 de la Liga FUTVE Fem: la Temporada Élite 2027, la inversión del Programa de Desarrollo de Ligas de la FIFA, el apoyo comercial, el mercadeo y las comunicaciones. No es una evaluación del club.</p>
    <ul>
      <li><b>Seis módulos.</b> El club puede repartirlos: cada módulo indica qué área del club conviene que lo responda.</li>
      <li><b>Se guarda automáticamente en el servidor.</b> Puede salir y volver a entrar desde cualquier equipo con el usuario del club. Varias personas pueden responder a la vez, cada una en su módulo.</li>
      <li><b>Si no tiene el dato,</b> marque «No sé» o déjelo en blanco. Solo son obligatorios el club y el correo.</li>
      <li><b>Confidencialidad:</b> la información la usa solo el equipo autorizado de la FVF y no se publican datos por club.</li>
    </ul>
    <p class="meta"><b>Fecha límite:</b> <span id="intplazo">—</span> · <b>Dudas:</b> Andreina Peláez, andreina.pelaez@fvf.com.ve</p>
  </div>

  <div class="msg show ok roaviso" id="roaviso" hidden></div>
  <div class="stick" id="stick">
    <div class="nav" id="nav"></div>
    <div class="bar"><i id="prog"></i></div>
    <div class="curmod" id="curmod"></div>
  </div>
  <form id="f" novalidate></form>
  <div class="msg" id="msg"></div>
  <div class="foot" id="foot">
    <button type="button" class="btn s" id="prev">Anterior</button>
    <span class="saved" id="saved"></span>
    <button type="button" class="btn p" id="next">Siguiente</button>
  </div>
  <div class="done" id="done">
    <h2>Gracias por completar la evaluación</h2>
    <p>Sus respuestas llegaron a la FVF. Con ellas armamos el plan del fútbol femenino 2027 y los veremos en la próxima mesa de clubes.</p>
    <p><button type="button" class="btn s" id="dl2">Descargar copia de mis respuestas</button></p>
  </div>
</main>
<div class="pfoot"><span><b>FVF</b> · Federación Venezolana de Fútbol</span><span>Liga FUTVE Fem · Evaluación de clubes 2027</span></div>
<div class="toast" id="toast" role="status" aria-live="polite"><i><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></i><span></span></div>
`;
