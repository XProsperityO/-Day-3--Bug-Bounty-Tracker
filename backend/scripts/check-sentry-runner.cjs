(async function(){
  try{
    const mod = await import('./check-sentry.mjs');
    const exit = await (mod.default ? mod.default() : 0);
    console.log('RUNNER: exit code', exit);
    process.exit(exit || 0);
  }catch(e){
    console.error('RUNNER ERROR', e);
    process.exit(2);
  }
})();
