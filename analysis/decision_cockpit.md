# LUMEN decision cockpit

The cockpit makes the launch trade-off explicit by combining the tested price/channel cases with user-controlled assumptions for customers, repeat purchases, and CAC.

Example:

```bash
python analysis/decision_cockpit.py --price 2.19 --channel "DTC Online" --customers 1000 --repeat-purchases 2 --cac 44
```

The output reports acceptance, net price, contribution per unit, contribution margin, total contribution, acquisition spend, and a contribution-to-acquisition-spend ratio.

The default CAC of €44 is the brief's blended marketing-funnel headline; it is an assumption and can be overridden. The model does not claim that survey acceptance equals German demand, and it does not expose or read personal survey fields. Repeat purchases and customer count are explicit scenario inputs so users can test optimistic, base, and conservative cases.
