# Model Fairness Analysis Report

## Overview

This report analyzes the fairness of the settlement value prediction model across different demographic and case-type groups.

Number of attributes analyzed: 7

## Summary of Findings

| Attribute | Groups | Max Bias | Max RMSE | Notes |
|-----------|--------|----------|----------|-------|
| Gender | 3 | -1.6% (Male) | 301.9 (Female) |  |
| AccidentType | 12 | -9.3% (Other side changed lanes on a roundabout colliding with clt's vehicle) | 391.5 (Rear end - 3 car - Clt at front) | Some groups have low sample count.  |
| Vehicle Type | 3 | -3.0% (Truck) | 305.8 (Truck) |  |
| Injury_Prognosis | 11 | -8.2% (L. 12 months) | 389.2 (I. 9 months) | Some groups have low sample count.  |
| Weather Conditions | 3 | -2.8% (Rainy) | 320.4 (Rainy) |  |
| Dominant injury | 4 | -4.3% (Legs) | 332.9 (Legs) |  |
| Whiplash | 2 | -1.4% (No) | 311.4 (No) |  |

## Detailed Analysis

### Gender

#### Key Insights

- Highest prediction bias: -1.6% for Male
- Lowest prediction bias: -0.6% for Other
- The model tends to **underpredict** for Male
- Highest percentage error: 17.0% for Other
- Lowest percentage error: 14.6% for Female

#### Visualizations

![Bias by Gender](Gender/Gender_bias.png)

![Error Metrics by Gender](Gender/Gender_errors.png)

![MAPE by Gender](Gender/Gender_mape.png)

![Sample Count by Gender](Gender/Gender_counts.png)

#### Metrics Table

|        |   count |    rmse |     mae |    mape |   mean_true |   mean_pred |      bias |   relative_bias |
|:-------|--------:|--------:|--------:|--------:|------------:|------------:|----------:|----------------:|
| Female |     336 | 301.911 | 175.762 | 14.5693 |     1227.96 |     1214.08 | -13.8756  |       -1.12998  |
| Other  |     331 | 298.457 | 182.538 | 16.9767 |     1185.18 |     1178.01 |  -7.16338 |       -0.604415 |
| Male   |     312 | 295.877 | 186.685 | 16.2139 |     1267.46 |     1247.48 | -19.9813  |       -1.57648  |

---

### AccidentType

#### Key Insights

- Highest prediction bias: -9.3% for Other side changed lanes on a roundabout colliding with clt's vehicle
- Lowest prediction bias: 0.3% for Other side collided with Clt's parked vehicle
- The model tends to **underpredict** for Other side changed lanes on a roundabout colliding with clt's vehicle
- Highest percentage error: 25.3% for Other side reversed into Clt's vehicle
- Lowest percentage error: 11.5% for Other side changed lanes on a roundabout colliding with clt's vehicle

⚠️ **Warning**: Low sample count (12) for Other side collided with Clt's parked vehicle. Results may not be reliable.

#### Visualizations

![Bias by AccidentType](AccidentType/AccidentType_bias.png)

![Error Metrics by AccidentType](AccidentType/AccidentType_errors.png)

![MAPE by AccidentType](AccidentType/AccidentType_mape.png)

![Sample Count by AccidentType](AccidentType/AccidentType_counts.png)

#### Metrics Table

|                                                                       |   count |    rmse |     mae |    mape |   mean_true |   mean_pred |       bias |   relative_bias |
|:----------------------------------------------------------------------|--------:|--------:|--------:|--------:|------------:|------------:|-----------:|----------------:|
| Rear end                                                              |     492 | 298.175 | 178.542 | 15.9224 |    1198.4   |    1189.93  |   -8.46706 |       -0.70653  |
| Other side pulled out of side road                                    |     121 | 317.789 | 188.715 | 16.3274 |    1213.96  |    1226.08  |   12.1246  |        0.998768 |
| Other                                                                 |      76 | 263.082 | 157.064 | 12.2394 |    1282.01  |    1276.5   |   -5.50147 |       -0.42913  |
| Other side turned across Clt's path                                   |      56 | 264.751 | 173.921 | 16.6198 |    1240.65  |    1181.03  |  -59.6201  |       -4.80555  |
| Rear end - Clt pushed into next vehicle                               |      45 | 348.452 | 203.935 | 13.8621 |    1408.1   |    1371.78  |  -36.3254  |       -2.57974  |
| Other side changed lanes and collided with clt's vehicle              |      44 | 274.183 | 193.698 | 22.652  |    1035.01  |    1030     |   -5.00112 |       -0.483198 |
| Rear end - 3 car - Clt at front                                       |      28 | 391.461 | 214.651 | 14.499  |    1309.78  |    1205.4   | -104.372   |       -7.9687   |
| Other side reversed into Clt's vehicle                                |      21 | 323.956 | 191.764 | 25.2712 |    1278.86  |    1338.9   |   60.0409  |        4.69489  |
| Other side pulled on to roundabout                                    |      16 | 254.236 | 197.138 | 17.7638 |    1187.39  |    1229.81  |   42.4232  |        3.57282  |
| Other side drove on wrong side of the road                            |      16 | 313.171 | 205.959 | 12.2637 |    1364.54  |    1341.11  |  -23.4347  |       -1.7174   |
| Other side changed lanes on a roundabout colliding with clt's vehicle |      14 | 327.48  | 238.174 | 11.4749 |    2070.34  |    1878.22  | -192.12    |       -9.27963  |
| Other side collided with Clt's parked vehicle                         |      12 | 234.176 | 141.905 | 14.4723 |     920.285 |     922.618 |    2.33285 |        0.253492 |

---

### Vehicle Type

#### Key Insights

- Highest prediction bias: -3.0% for Truck
- Lowest prediction bias: 0.4% for Car
- The model tends to **underpredict** for Truck
- Highest percentage error: 17.2% for Car
- Lowest percentage error: 14.1% for Truck

#### Visualizations

![Bias by Vehicle Type](Vehicle Type/Vehicle Type_bias.png)

![Error Metrics by Vehicle Type](Vehicle Type/Vehicle Type_errors.png)

![MAPE by Vehicle Type](Vehicle Type/Vehicle Type_mape.png)

![Sample Count by Vehicle Type](Vehicle Type/Vehicle Type_counts.png)

#### Metrics Table

|            |   count |    rmse |     mae |    mape |   mean_true |   mean_pred |      bias |   relative_bias |
|:-----------|--------:|--------:|--------:|--------:|------------:|------------:|----------:|----------------:|
| Truck      |     331 | 305.827 | 184.276 | 14.0665 |     1295.29 |     1256.88 | -38.4091  |       -2.9653   |
| Car        |     316 | 304.087 | 187.176 | 17.1563 |     1195.41 |     1199.7  |   4.29366 |        0.359179 |
| Motorcycle |     310 | 286.412 | 170.289 | 15.9098 |     1195.72 |     1188.52 |  -7.19739 |       -0.60193  |

---

### Injury_Prognosis

#### Key Insights

- Highest prediction bias: -8.2% for L. 12 months
- Lowest prediction bias: 0.3% for B. 2 months
- The model tends to **underpredict** for L. 12 months
- Highest percentage error: 18.1% for J. 10 months
- Lowest percentage error: 12.5% for L. 12 months

⚠️ **Warning**: Low sample count (16) for L. 12 months. Results may not be reliable.

#### Visualizations

![Bias by Injury_Prognosis](Injury_Prognosis/Injury_Prognosis_bias.png)

![Error Metrics by Injury_Prognosis](Injury_Prognosis/Injury_Prognosis_errors.png)

![MAPE by Injury_Prognosis](Injury_Prognosis/Injury_Prognosis_mape.png)

![Sample Count by Injury_Prognosis](Injury_Prognosis/Injury_Prognosis_counts.png)

#### Metrics Table

|              |   count |    rmse |     mae |    mape |   mean_true |   mean_pred |      bias |   relative_bias |
|:-------------|--------:|--------:|--------:|--------:|------------:|------------:|----------:|----------------:|
| F. 6 months  |     220 | 281.877 | 171.446 | 15.6785 |     1198.11 |     1167.8  | -30.3052  |       -2.52942  |
| G. 7 months  |     144 | 264.92  | 164.191 | 15.2312 |     1213.88 |     1221.84 |   7.95712 |        0.655509 |
| E. 5 months  |     143 | 356.045 | 212.135 | 17.7515 |     1281.11 |     1265.36 | -15.7556  |       -1.22983  |
| H. 8 months  |     116 | 311.479 | 203.418 | 17.791  |     1256.01 |     1270.63 |  14.6149  |        1.1636   |
| D. 4 months  |      84 | 304.906 | 184.389 | 14.5094 |     1314.38 |     1295.66 | -18.7249  |       -1.42462  |
| A. 1 month   |      68 | 225.401 | 134.607 | 14.5481 |     1043.34 |     1078.77 |  35.4298  |        3.39582  |
| I. 9 months  |      46 | 389.225 | 232.666 | 17.5437 |     1345.23 |     1301.94 | -43.2894  |       -3.218    |
| B. 2 months  |      44 | 220.408 | 143.368 | 13.6524 |     1155.91 |     1159.01 |   3.10527 |        0.268644 |
| J. 10 months |      35 | 357.419 | 231.713 | 18.1491 |     1323.54 |     1290.54 | -33.0038  |       -2.4936   |
| C. 3 months  |      22 | 286.291 | 167.662 | 16.3913 |     1047.02 |     1036.15 | -10.873   |       -1.03847  |
| L. 12 months |      16 | 215.833 | 147.311 | 12.5029 |     1218.59 |     1119.27 | -99.327   |       -8.15096  |

---

### Weather Conditions

#### Key Insights

- Highest prediction bias: -2.8% for Rainy
- Lowest prediction bias: 0.2% for Snowy
- The model tends to **underpredict** for Rainy
- Highest percentage error: 16.8% for Snowy
- Lowest percentage error: 15.5% for Rainy

#### Visualizations

![Bias by Weather Conditions](Weather Conditions/Weather Conditions_bias.png)

![Error Metrics by Weather Conditions](Weather Conditions/Weather Conditions_errors.png)

![MAPE by Weather Conditions](Weather Conditions/Weather Conditions_mape.png)

![Sample Count by Weather Conditions](Weather Conditions/Weather Conditions_counts.png)

#### Metrics Table

|       |   count |    rmse |     mae |    mape |   mean_true |   mean_pred |      bias |   relative_bias |
|:------|--------:|--------:|--------:|--------:|------------:|------------:|----------:|----------------:|
| Sunny |     330 | 289.549 | 177.571 | 15.5832 |     1206.39 |     1198.07 |  -8.3252  |       -0.690091 |
| Snowy |     328 | 293.553 | 186.434 | 16.8417 |     1224.84 |     1227.67 |   2.83747 |        0.231661 |
| Rainy |     299 | 320.441 | 183.828 | 15.4737 |     1247.44 |     1212.96 | -34.4818  |       -2.7642   |

---

### Dominant injury

#### Key Insights

- Highest prediction bias: -4.3% for Legs
- Lowest prediction bias: -0.1% for Multiple
- The model tends to **underpredict** for Legs
- Highest percentage error: 16.7% for Arms
- Lowest percentage error: 15.4% for Multiple

#### Visualizations

![Bias by Dominant injury](Dominant injury/Dominant injury_bias.png)

![Error Metrics by Dominant injury](Dominant injury/Dominant injury_errors.png)

![MAPE by Dominant injury](Dominant injury/Dominant injury_mape.png)

![Sample Count by Dominant injury](Dominant injury/Dominant injury_counts.png)

#### Metrics Table

|          |   count |    rmse |     mae |    mape |   mean_true |   mean_pred |     bias |   relative_bias |
|:---------|--------:|--------:|--------:|--------:|------------:|------------:|---------:|----------------:|
| Multiple |     260 | 266.044 | 167.93  | 15.3887 |     1168.14 |     1167.04 |  -1.1005 |      -0.0942094 |
| Legs     |     249 | 332.856 | 196.379 | 15.7946 |     1256.2  |     1201.82 | -54.385  |      -4.32933   |
| Arms     |     229 | 311.745 | 182.684 | 16.6539 |     1223.04 |     1241.73 |  18.683  |       1.52758   |
| Hips     |     220 | 274.428 | 173.421 | 15.4246 |     1248.24 |     1232.76 | -15.4796 |      -1.24011   |

---

### Whiplash

#### Key Insights

- Highest prediction bias: -1.4% for No
- Lowest prediction bias: -0.8% for Yes
- The model tends to **underpredict** for No
- Highest percentage error: 16.5% for No
- Lowest percentage error: 15.4% for Yes

#### Visualizations

![Bias by Whiplash](Whiplash/Whiplash_bias.png)

![Error Metrics by Whiplash](Whiplash/Whiplash_errors.png)

![MAPE by Whiplash](Whiplash/Whiplash_mape.png)

![Sample Count by Whiplash](Whiplash/Whiplash_counts.png)

#### Metrics Table

|     |   count |    rmse |     mae |    mape |   mean_true |   mean_pred |     bias |   relative_bias |
|:----|--------:|--------:|--------:|--------:|------------:|------------:|---------:|----------------:|
| Yes |     495 | 288.751 | 176.964 | 15.426  |     1241.37 |     1230.98 | -10.3912 |       -0.837071 |
| No  |     462 | 311.402 | 187.186 | 16.4612 |     1211.53 |     1193.98 | -17.542  |       -1.44793  |

---

## Recommendations

No high-priority fairness issues detected. Continue monitoring model performance across groups.

## Conclusion

This fairness analysis provides insights into how the settlement prediction model performs across different groups. The model appears to perform consistently across different groups, with no major fairness concerns identified. Continued monitoring is recommended as new data becomes available.

