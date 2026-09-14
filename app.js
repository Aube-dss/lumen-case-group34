const cases={
  "1.79":{"DTC Online":[61.7,.77,55.3],"Retail/Grocery":[61.7,.40,39.2],"Gym & Office":[61.7,.81,56.7]},
  "2.19":{"DTC Online":[51.7,1.16,65.1],"Retail/Grocery":[51.7,.63,50.3],"Gym & Office":[51.7,1.13,64.6]},
  "2.59":{"DTC Online":[26.7,1.54,71.4],"Retail/Grocery":[26.7,.86,58.0],"Gym & Office":[26.7,1.45,70.1]}
};
const $=id=>document.getElementById(id), euro=n=>new Intl.NumberFormat("en-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
function update(){
  const c=cases[$("price").value][$("channel").value], customers=+$("customers").value, repeat=+$("repeat").value, cac=+$("cac").value;
  const total=customers*repeat*c[1], spend=customers*cac;
  $("acceptance").textContent=c[0].toFixed(1)+"%"; $("unit").textContent="€"+c[1].toFixed(2);
  $("margin").textContent=c[2].toFixed(1)+"%"; $("total").textContent=euro(total); $("spend").textContent=euro(spend);
  $("ratio").textContent=(total/spend).toFixed(2)+"×"; $("note").textContent="At this price and channel, the scenario produces "+euro(total)+" contribution before acquisition spend.";
  $("customersOut").textContent=customers.toLocaleString(); $("repeatOut").textContent=repeat.toFixed(1); $("cacOut").textContent=cac;
}
["price","channel","customers","repeat","cac"].forEach(id=>$(id).addEventListener("input",update)); update();