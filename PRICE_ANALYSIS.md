# Programme d'analyse du prix

Le fichier `analyze_price.py` est un exemple volontairement simple et commenté pour étudier le compromis entre acceptation client et contribution unitaire.

## Exécution

Depuis la racine du dépôt :

```text
python analyze_price.py
```

Le programme lit `data/price_test_results.csv` et `data/price_sensitivity_survey.csv`, affiche les trois prix candidats, calcule leur contribution moyenne par canal et résume les seuils de prix perçus.

## Exercices à essayer

1. Remplacer `balanced_price = 2.19` par `1.79` ou `2.59` et comparer la recommandation.
2. Calculer une contribution pondérée avec un mix de canaux au lieu d'une moyenne simple.
3. Ajouter un scénario de volume pour comparer la contribution totale, pas seulement la contribution par unité.

La recommandation est un point de départ analytique : LUMEN ne dispose pas encore de ventes allemandes réelles.
