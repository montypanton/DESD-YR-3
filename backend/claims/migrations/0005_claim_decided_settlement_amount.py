# Generated by Django 5.2 on 2025-05-02 11:23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('claims', '0004_alter_claim_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='claim',
            name='decided_settlement_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
