<script setup lang="ts">
import {
  PhCheck,
  PhCheckCircle,
  PhXCircle,
  PhWarning,
  PhCurrencyDollarSimple,
  PhRocketLaunch,
  PhTrophy,
  PhGift,
  PhConfetti,
  PhNote,
  PhDeviceMobile,
  PhStar
} from '@phosphor-icons/vue';

const props = defineProps<{
  name: 'check' | 'check-circle' | 'x-circle' | 'warning' | 'currency' | 'rocket' | 'trophy' | 'gift' | 'confetti' | 'note' | 'device-mobile' | 'star';
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  color?: string;
}>();

const iconMap = {
  'check': PhCheck,
  'check-circle': PhCheckCircle,
  'x-circle': PhXCircle,
  'warning': PhWarning,
  'currency': PhCurrencyDollarSimple,
  'rocket': PhRocketLaunch,
  'trophy': PhTrophy,
  'gift': PhGift,
  'confetti': PhConfetti,
  'note': PhNote,
  'device-mobile': PhDeviceMobile,
  'star': PhStar,
};
</script>

<template>
  <component
    :is="iconMap[name]"
    :size="size || 16"
    :weight="weight || 'regular'"
    :color="color"
    style="display: inline-block; vertical-align: middle;"
  />
</template>
